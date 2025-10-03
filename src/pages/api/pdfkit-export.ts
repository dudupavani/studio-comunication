// src/pages/api/pdfkit-export.ts
import type { NextApiRequest, NextApiResponse } from "next";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

/** Converte Y do Konva (top-left) para Y do PDFKit (bottom-left) */
function toBottomLeftY(pageH: number, yTop: number, h: number) {
  return pageH - (yTop + h);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const stage = body.stage || {};
    const shapes = body.shapes || {};
    const order: string[] = body.order || [];

    const pageW = Number(stage.width) || 595;
    const pageH = Number(stage.height) || 842;

    const doc = new PDFDocument({ size: [pageW, pageH], margin: 0 });

    // Captura saída em buffer
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    // Registrar fonte Inter se existir
    try {
      const fontPath = path.join(
        process.cwd(),
        "public",
        "fonts",
        "Inter-Regular.ttf"
      );
      if (fs.existsSync(fontPath)) {
        doc.registerFont("Inter", fontPath);
        doc.font("Inter");
      }
    } catch (e) {
      console.warn("⚠️ Fonte Inter não carregada:", e);
    }

    // Fundo (desenha em sistema PDF padrão)
    if (stage.background) {
      doc.rect(0, 0, pageW, pageH).fill(stage.background);
      doc.fillColor("black"); // reset
    }

    // Render shapes na ordem
    if (order.length) {
      for (const id of order) {
        const s = shapes[id];
        if (!s) continue;

        // RECT
        if (s.type === "rect") {
          const yBL = toBottomLeftY(pageH, s.y, s.height);
          doc.save();
          doc.rotate(-(s.rotation || 0), {
            origin: [s.x + s.width / 2, yBL + s.height / 2],
          });
          doc
            .rect(s.x, yBL, s.width, s.height)
            .fillAndStroke(s.fill || "transparent", s.stroke || undefined);
          doc.restore();
          continue;
        }

        // TRIANGLE
        if (s.type === "triangle") {
          const yBL = toBottomLeftY(pageH, s.y, s.height);
          const pts: [number, number][] = [
            [s.x + s.width / 2, yBL + s.height],
            [s.x, yBL],
            [s.x + s.width, yBL],
          ];
          doc.save();
          doc.rotate(-(s.rotation || 0), {
            origin: [s.x + s.width / 2, yBL + s.height / 2],
          });
          doc
            .polygon(...pts)
            .fillAndStroke(s.fill || "transparent", s.stroke || undefined);
          doc.restore();
          continue;
        }

        // POLYGON
        if (s.type === "polygon") {
          const sides = Math.max(3, s.sides || 5);
          const yBL = toBottomLeftY(pageH, s.y, s.height);
          const cx = s.x + s.width / 2;
          const cy = yBL + s.height / 2;
          const rx = s.width / 2,
            ry = s.height / 2;
          const pts: [number, number][] = [];
          for (let i = 0; i < sides; i++) {
            const ang = (2 * Math.PI * i) / sides - Math.PI / 2;
            pts.push([cx + rx * Math.cos(ang), cy + ry * Math.sin(ang)]);
          }
          doc.save();
          doc.rotate(-(s.rotation || 0), { origin: [cx, cy] });
          doc
            .polygon(...pts)
            .fillAndStroke(s.fill || "transparent", s.stroke || undefined);
          doc.restore();
          continue;
        }

        // STAR
        if (s.type === "star") {
          const points = Math.max(2, s.numPoints || 5);
          const yBL = toBottomLeftY(pageH, s.y, s.height);
          const cx = s.x + s.width / 2;
          const cy = yBL + s.height / 2;
          const outerR = Math.min(s.width, s.height) / 2;
          const innerR = outerR / 2;
          const pts: [number, number][] = [];
          for (let i = 0; i < points * 2; i++) {
            const ang = (Math.PI * i) / points - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
          }
          doc.save();
          doc.rotate(-(s.rotation || 0), { origin: [cx, cy] });
          doc
            .polygon(...pts)
            .fillAndStroke(s.fill || "transparent", s.stroke || undefined);
          doc.restore();
          continue;
        }

        // CIRCLE
        if (s.type === "circle") {
          const yBL = toBottomLeftY(pageH, s.y, s.height);
          const cx = s.x + s.width / 2;
          const cy = yBL + s.height / 2;
          doc.save();
          doc.rotate(-(s.rotation || 0), { origin: [cx, cy] });
          doc
            .ellipse(cx, cy, s.width / 2, s.height / 2)
            .fillAndStroke(s.fill || "transparent", s.stroke || undefined);
          doc.restore();
          continue;
        }

        // TEXT
        if (s.type === "text") {
          const yBL = toBottomLeftY(pageH, s.y, s.height);
          doc.save();
          doc.rotate(-(s.rotation || 0), { origin: [s.x, yBL] });
          doc
            .fillColor(s.fill || "black")
            .font("Inter")
            .fontSize(s.fontSize || 14)
            .text(s.text || "", s.x, yBL, {
              width: s.width,
              height: s.height,
            });
          doc.restore();
          continue;
        }

        // IMAGE (fix: Y correto + rotação no centro com transformação local)
        if (s.type === "image" && s.src) {
          try {
            const resp = await fetch(s.src);
            if (!resp.ok) throw new Error(`Erro HTTP ${resp.status}`);
            const buf = Buffer.from(await resp.arrayBuffer());

            // bottom-left no sistema do PDF
            const x = s.x;
            const yBL = pageH - (s.y + s.height);

            doc.save();
            // leva a origem para o canto inferior-esquerdo da área da imagem
            doc.translate(x, yBL);
            // roda em torno do centro da própria imagem (coordenadas locais)
            doc.rotate(-(s.rotation || 0), {
              origin: [s.width / 2, s.height / 2],
            });
            // desenha a imagem na origem local
            doc.image(buf, 0, 0, { width: s.width, height: s.height });
            doc.restore();
          } catch (e) {
            console.error("Erro ao carregar imagem:", s.src, e);
          }
          continue;
        }
      }
    }
    doc.end();
    const pdf = await done;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${body.title || "export"}.pdf"`
    );
    res.status(200).send(pdf);
  } catch (err) {
    console.error("❌ Erro export (PDFKit):", err);
    res.status(500).json({ error: "Erro ao gerar PDF" });
  }
}
