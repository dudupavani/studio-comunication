// src/app/(app)/design-editor/editor/utils/export.ts
import jsPDF from "jspdf";
import Konva from "konva";

function downloadURI(uri: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Exportar para PNG
export function exportStageToPNG(stage: Konva.Stage, filename = "export.png") {
  const dataURL = stage.toDataURL({
    mimeType: "image/png",
    pixelRatio: 2,
  });
  downloadURI(dataURL, filename);
}

// Exportar para JPEG
export function exportStageToJPEG(stage: Konva.Stage, filename = "export.jpg") {
  const dataURL = stage.toDataURL({
    mimeType: "image/jpeg",
    quality: 0.95,
    pixelRatio: 2,
  });
  downloadURI(dataURL, filename);
}

// Exportar para PDF (web, leve)
export function exportStageToPDF(stage: Konva.Stage, filename = "export.pdf") {
  const dataURL = stage.toDataURL({
    mimeType: "image/png",
    pixelRatio: 2,
  });

  const pdf = new jsPDF({
    orientation: stage.width() > stage.height() ? "l" : "p",
    unit: "px",
    format: [stage.width(), stage.height()],
  });

  pdf.addImage(dataURL, "PNG", 0, 0, stage.width(), stage.height());
  pdf.save(filename);
}

// Exportar para PDF 300dpi (servidor)
export async function exportStageToPDF300dpi(
  stage: Konva.Stage,
  filename = "export-300dpi.pdf"
) {
  // calcula fator de escala px → 300 dpi
  const pixelRatio = 300 / 72; // ≈ 4.1667

  // gera imagem em alta resolução
  const dataUrl = stage.toDataURL({
    mimeType: "image/png",
    pixelRatio,
  });

  // envia para backend
  const res = await fetch("/api/pdfkit-export-300dpi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stage: { width: stage.width(), height: stage.height() },
      imageBase64: dataUrl,
      title: filename.replace(".pdf", ""),
    }),
  });

  if (!res.ok) throw new Error("Erro ao gerar PDF 300dpi");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
