import { centerCrop, makeAspectCrop } from "react-image-crop";

const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "pif",
  "app",
  "dmg",
  "sh",
  "ps1",
  "vbs",
  "wsf",
  "wsh",
  "jar",
  "apk",
  "ipa",
  "zip",
]);

const BLOCKED_ATTACHMENT_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-dosexec",
  "application/x-executable",
  "application/x-msi",
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
]);

export function createComposerBlockId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `block_${Math.random().toString(36).slice(2, 11)}`;
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function extractFileExtension(fileName: string) {
  const segments = fileName.split(".");
  if (segments.length < 2) return "";
  return segments.pop()?.toLowerCase() ?? "";
}

export function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export function isBlockedAttachment(file: File) {
  const extension = extractFileExtension(file.name);
  const mimeType = file.type.toLowerCase();
  return (
    BLOCKED_ATTACHMENT_EXTENSIONS.has(extension) ||
    BLOCKED_ATTACHMENT_MIME_TYPES.has(mimeType)
  );
}

export function revokeBlobUrl(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export async function parseJson<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Falha na requisição (${res.status}).`;
    throw new Error(message);
  }

  return payload as T;
}
