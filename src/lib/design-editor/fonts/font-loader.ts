// src/components/design-editor/fonts/font-loader.ts
import { useEffect, useState } from "react";
import fonts from "./fonts.json";

export type FontRequest = {
  family: string;
  weight: number; // 100..900
  style: "normal" | "italic";
  subset?: "latin" | "latin-ext";
};

export type FontVariantKey = string; // "Montserrat:700:normal:latin"

/** Variantes já confirmadas como carregadas pelo browser */
const loadedVariants = new Set<FontVariantKey>();

/** Promises em voo por variante (evita requisições duplicadas concorrentes) */
const inflightVariants = new Map<FontVariantKey, Promise<void>>();

/** Um <link> por família apontando para css2 (é suficiente) */
const familyToLink: Record<string, HTMLLinkElement> = {};

function makeKey(req: FontRequest): FontVariantKey {
  return `${req.family}:${req.weight}:${req.style}:${req.subset || "latin"}`;
}

/**
 * Constrói URL do Google Fonts css2 adequando:
 * - Apenas normal:   family=Name:wght@400;700
 * - Com itálico:     family=Name:ital,wght@0,400;1,400;1,700
 * Mantém display=swap e subset quando informado.
 */
function buildCss2Url(family: string, variants: FontRequest[]): string {
  const familyParam = family.trim().replace(/\s+/g, "+");
  const subset = variants[0]?.subset || "latin";

  // Normalizamos e deduplicamos pares (italFlag, weight)
  const pairs = new Set<string>();
  let hasItalic = false;
  for (const v of variants) {
    const italFlag = v.style === "italic" ? 1 : 0;
    if (italFlag === 1) hasItalic = true;
    // weight ao padrão 100..900
    const w = Math.max(100, Math.min(900, Math.round(v.weight / 100) * 100));
    pairs.add(`${italFlag},${w}`);
  }

  let axisPart: string;
  if (hasItalic) {
    // ital,wght@0,400;1,400;1,700...
    const ordered = Array.from(pairs)
      .map((p) => {
        const [i, w] = p.split(",").map((x) => x.trim());
        return { i: Number(i), w: Number(w) };
      })
      .sort((a, b) => a.i - b.i || a.w - b.w)
      .map(({ i, w }) => `${i},${w}`)
      .join(";");
    axisPart = `ital,wght@${ordered}`;
  } else {
    // Apenas wght@400;700...
    const weights = Array.from(
      new Set(Array.from(pairs).map((p) => Number(p.split(",")[1])))
    )
      .sort((a, b) => a - b)
      .join(";");
    axisPart = `wght@${weights}`;
  }

  // css2 base
  let url = `https://fonts.googleapis.com/css2?family=${familyParam}:${axisPart}&display=swap`;
  if (subset) url += `&subset=${encodeURIComponent(subset)}`;
  return url;
}

function ensureLink(family: string, variants: FontRequest[]) {
  const id = `gf-${family.trim().replace(/\s+/g, "-").toLowerCase()}`;
  let link = familyToLink[family];
  const href = buildCss2Url(family, variants);

  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = id;
    document.head.appendChild(link);
    familyToLink[family] = link;
  }

  // Evita re-sets desnecessários
  if (link.href !== href) {
    link.href = href;
  }
}

/** Aguarda a variante específica ficar disponível no browser */
async function waitForFont(req: FontRequest, signal?: AbortSignal) {
  const key = makeKey(req);
  // Família entre aspas; inclui estilo/weight para a variação correta
  const weight = Math.max(
    100,
    Math.min(900, Math.round(req.weight / 100) * 100)
  );
  const fontSpec = `${
    req.style === "italic" ? "italic " : ""
  }normal ${weight} 16px "${req.family}"`;

  // Abort “soft”: se abortar, apenas não propaga a aplicação
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  try {
    // @ts-ignore - alguns ambientes não tipam document.fonts
    if (document?.fonts?.load) {
      // O primeiro load “puxa” a variante
      await (document as any).fonts.load(fontSpec);
      // E aguardamos o conjunto de fontes estar “ready”
      await (document as any).fonts.ready;
    } else {
      // Fallback mínimo
      await new Promise((r) => setTimeout(r, 60));
    }

    // Se abortou durante, não confirme carregamento
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    loadedVariants.add(key);
    window.dispatchEvent(
      new CustomEvent("design-editor:font-loaded", { detail: { ...req, key } })
    );
  } catch (err) {
    // Notifica erro, mas deixa o chamador decidir o que fazer
    window.dispatchEvent(
      new CustomEvent("design-editor:font-error", {
        detail: { ...req, key, reason: (err as Error)?.message ?? String(err) },
      })
    );
    throw err;
  }
}

/**
 * Solicita a variante e aguarda ficar disponível. Coalesce chamadas concorrentes.
 * Aceita AbortSignal para estratégia “latest-only”.
 */
export async function requestFont(
  req: FontRequest,
  signal?: AbortSignal
): Promise<void> {
  const key = makeKey(req);
  if (loadedVariants.has(key)) return;

  // Se já houver em voo, reutilize a mesma promise
  const existing = inflightVariants.get(key);
  if (existing) {
    // Apenas espera a existente; abort do chamador cancela aplicação, não o download do browser
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return existing;
  }

  // Monte a lista de variantes já conhecidas da mesma família para gerar o css2 completo
  const family = req.family;
  const existingVariants: FontRequest[] = [];
  loadedVariants.forEach((k) => {
    const [fam, weight, style, subset] = k.split(":");
    if (fam === family) {
      existingVariants.push({
        family: fam,
        weight: parseInt(weight, 10),
        style: style as "normal" | "italic",
        subset: (subset as "latin" | "latin-ext") || "latin",
      });
    }
  });

  const allVariants = [...existingVariants, req];
  ensureLink(family, allVariants);

  const promise = (async () => {
    try {
      await waitForFont(req, signal);
    } finally {
      inflightVariants.delete(key);
    }
  })();

  inflightVariants.set(key, promise);
  return promise;
}

/**
 * Garante que uma família/variação esteja carregada antes do uso
 * - Inclui AbortSignal para “latest-only”
 * - Idempotente/seguro
 */
export async function ensureFontLoaded(
  family: string,
  weight: number = 400,
  style: "normal" | "italic" = "normal",
  signal?: AbortSignal
): Promise<void> {
  const req: FontRequest = {
    family,
    weight,
    style,
    subset: "latin",
  };

  try {
    await requestFont(req, signal);

    // Dupla checagem defensiva
    const weightNorm = Math.max(
      100,
      Math.min(900, Math.round(weight / 100) * 100)
    );
    const fontSpec = `${
      style === "italic" ? "italic " : ""
    }normal ${weightNorm} 16px "${family}"`;
    // @ts-ignore
    await (document as any).fonts?.load?.(fontSpec);
    // @ts-ignore
    await (document as any).fonts?.ready;
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      // Cancelado pelo chamador — não é erro operacional
      return;
    }
    console.warn(`Failed to load font: ${family}`, err);
    // Prossegue sem lançar para não quebrar UX
  }
}

export function isVariantLoaded(key: FontVariantKey): boolean {
  return loadedVariants.has(key);
}

export async function ensureVariants(
  reqs: FontRequest[],
  signal?: AbortSignal
): Promise<void> {
  for (const req of reqs) {
    await requestFont(req, signal);
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
    setFamilies((fonts as any[]).map((f) => f.family));
  }, []);

  return { families };
}
