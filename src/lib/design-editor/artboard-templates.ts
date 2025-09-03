// src/lib/design-editor/artboard-templates.ts

export type ArtboardBrand =
  | "instagram"
  | "linkedin"
  | "facebook"
  | "youtube"
  | "custom";

export type ArtboardCategory =
  | "post"
  | "story"
  | "thumbnail"
  | "cover"
  | "other";

export interface ArtboardTemplate {
  id: string;
  label: string; // Ex.: "Instagram • 1080 × 1080"
  width: number;
  height: number;
  brand?: ArtboardBrand;
  category?: ArtboardCategory;
}

/**
 * Templates mais comuns de redes sociais.
 * Obs.: mantenha dimensões em pixels (px).
 */
export const ARTBOARD_TEMPLATES: ArtboardTemplate[] = [
  {
    id: "instagram-square",
    label: "Instagram • 1080 × 1080",
    width: 1080,
    height: 1080,
    brand: "instagram",
    category: "post",
  },
  {
    id: "instagram-portrait",
    label: "Instagram • 1080 × 1350",
    width: 1080,
    height: 1350,
    brand: "instagram",
    category: "post",
  },
  {
    id: "instagram-story",
    label: "Instagram Story • 1080 × 1920",
    width: 1080,
    height: 1920,
    brand: "instagram",
    category: "story",
  },
  {
    id: "linkedin-square",
    label: "LinkedIn • 1200 × 1200",
    width: 1200,
    height: 1200,
    brand: "linkedin",
    category: "post",
  },
  {
    id: "facebook-link",
    label: "Facebook (Link) • 1200 × 630",
    width: 1200,
    height: 630,
    brand: "facebook",
    category: "post",
  },
  {
    id: "youtube-thumb",
    label: "YouTube Thumbnail • 1280 × 720",
    width: 1280,
    height: 720,
    brand: "youtube",
    category: "thumbnail",
  },
];

export const DEFAULT_ARTBOARD: ArtboardTemplate = ARTBOARD_TEMPLATES[0];

/**
 * Localiza um template pelo id.
 */
export function templateById(id: string): ArtboardTemplate | undefined {
  return ARTBOARD_TEMPLATES.find((t) => t.id === id);
}
