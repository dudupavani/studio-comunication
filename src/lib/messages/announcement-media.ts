type AnnouncementMediaInput = {
  content: string;
  mediaKind?: "image" | "video";
  mediaUrl?: string;
  mediaThumbnailUrl?: string;
};

type AnnouncementMediaFields = {
  media_kind: "image" | "video" | null;
  media_url: string | null;
  media_thumbnail_url: string | null;
};

export function extractFirstImageUrlFromHtml(content: string): string | null {
  const match = content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  const extracted = match?.[1]?.trim();
  return extracted ? extracted : null;
}

export function resolveAnnouncementMediaFields(
  input: AnnouncementMediaInput
): AnnouncementMediaFields {
  const explicitUrl = input.mediaUrl?.trim() || null;
  const fallbackImageUrl =
    !explicitUrl && input.mediaKind !== "video"
      ? extractFirstImageUrlFromHtml(input.content)
      : null;
  const mediaUrl = explicitUrl ?? fallbackImageUrl;

  if (!mediaUrl) {
    return {
      media_kind: null,
      media_url: null,
      media_thumbnail_url: null,
    };
  }

  const mediaKind = input.mediaKind === "video" ? "video" : "image";
  const thumbnail =
    input.mediaThumbnailUrl?.trim() || (mediaKind === "image" ? mediaUrl : null);

  return {
    media_kind: mediaKind,
    media_url: mediaUrl,
    media_thumbnail_url: thumbnail,
  };
}
