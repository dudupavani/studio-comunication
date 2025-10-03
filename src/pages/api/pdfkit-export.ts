import type { NextApiRequest, NextApiResponse } from "next";
import PDFDocument from "pdfkit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { stage, imageBase64, title } = req.body;

    // Calcula tamanho físico em pontos (1 pt = 1/72 inch)
    const widthPts = (stage.width / 300) * 72; // px → inches → pts
    const heightPts = (stage.height / 300) * 72;

    const doc = new PDFDocument({ size: [widthPts, heightPts], margin: 0 });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((r) =>
      doc.on("end", () => r(Buffer.concat(chunks)))
    );

    // Insere a imagem rasterizada já gerada no frontend
    const imgBuffer = Buffer.from(imageBase64.split(",")[1], "base64");
    doc.image(imgBuffer, 0, 0, { width: widthPts, height: heightPts });

    doc.end();
    const pdf = await done;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${title || "export-300dpi"}.pdf"`
    );
    res.status(200).send(pdf);
  } catch (err) {
    console.error("❌ Erro ao gerar PDF 300dpi:", err);
    res.status(500).json({ error: "Erro ao gerar PDF" });
  }
}
