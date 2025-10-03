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
    pixelRatio: 2, // aumenta a resolução
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
