// src/components/design-editor/fonts/font-loader.ts
import { useEffect, useState } from "react";
import fonts from "./fonts.json";

export type FontRequest = {
  family: string;
  weight: number;
  style: "normal" | "italic";
  subset?: "latin" | "latin-ext";
};

export type FontVariantKey = string; // "Montserrat:700:normal:latin"

const loadedVariants = new Set<FontVariantKey>();
const familyToLink: Record<string, HTMLLinkElement> = {};

function makeKey(req: FontRequest): FontVariantKey {
  return `${req.family}:${req.weight}:${req.style}:${req.subset || "latin"}`;
}

function buildCss2Url(family: string, variants: FontRequest[]): string {
  const familyParam = family.replace(/ /g, "+");
  const weights = Array.from(
    new Set(
      variants.map((v) => `${v.weight}${v.style === "italic" ? "i" : ""}`)
    )
  ).join(";");
  const subset = variants[0]?.subset || "latin";
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weights}&display=swap&subset=${subset}`;
}

function ensureLink(family: string, variants: FontRequest[]) {
  let link = familyToLink[family];
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = `gf-${family.replace(/\s+/g, "-").toLowerCase()}`;
    document.head.appendChild(link);
    familyToLink[family] = link;
  }
  link.href = buildCss2Url(family, variants);
}

async function waitForFont(req: FontRequest) {
  const key = makeKey(req);
  const fontSpec = `${req.style === "italic" ? "italic " : ""}${req.weight} 16px ${req.family}`;
  try {
    await (document as any).fonts.load(fontSpec);
    await (document as any).fonts.ready;
    loadedVariants.add(key);
    window.dispatchEvent(
      new CustomEvent("design-editor:font-loaded", { detail: { ...req, key } })
    );
  } catch (err) {
    window.dispatchEvent(
      new CustomEvent("design-editor:font-error", {
        detail: { ...req, key, reason: (err as Error).message },
      })
    );
    throw err;
  }
}

export async function requestFont(req: FontRequest): Promise<void> {
  const key = makeKey(req);
  if (loadedVariants.has(key)) return;

  const family = req.family;
  const existingVariants: FontRequest[] = [];
  loadedVariants.forEach((k) => {
    const [fam, weight, style, subset] = k.split(":");
    if (fam === family) {
      existingVariants.push({
        family: fam,
        weight: parseInt(weight, 10),
        style: style as "normal" | "italic",
        subset: subset as "latin" | "latin-ext",
      });
    }
  });

  const allVariants = [...existingVariants, req];
  ensureLink(family, allVariants);

  await waitForFont(req);
}

/**
 * Helper para garantir que uma fonte esteja carregada antes de usá-la
 * @param family Nome da fonte
 * @param weight Peso da fonte (400, 700, etc)
 * @param style Estilo da fonte (normal, italic)
 * @returns Promise que resolve quando a fonte está pronta
 */
export async function ensureFontLoaded(family: string, weight: number = 400, style: "normal" | "italic" = "normal"): Promise<void> {
  const fontSpec = `${style === "italic" ? "italic " : ""}${weight} 16px "${family}"`;
  try {
    // Primeiro, solicita o carregamento da fonte
    await requestFont({ family, weight, style, subset: "latin" });
    
    // Depois, espera que ela esteja realmente disponível
    await (document as any).fonts.load(fontSpec);
    await (document as any).fonts.ready;
  } catch (err) {
    console.warn(`Failed to load font: ${family}`, err);
    // Mesmo que falhe, continua a execução
  }
}

export function isVariantLoaded(key: FontVariantKey): boolean {
  return loadedVariants.has(key);
}

export async function ensureVariants(reqs: FontRequest[]): Promise<void> {
  for (const req of reqs) {
    await requestFont(req);
  }
}

export function getLoadedVariants(): FontVariantKey[] {
  return Array.from(loadedVariants);
}

export { buildCss2Url, makeKey };

/** 🔥 Hook para expor lista de fontes */
export function useFonts() {
  const [families, setFamilies] = useState<string[]>([]);

  useEffect(() => {
    setFamilies(fonts.map((f: any) => f.family));
  }, []);

  return { families };
}
