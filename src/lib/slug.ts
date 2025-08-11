// src/lib/slug.ts
export function slugify(input: string): string {
  return input
    .normalize("NFKD") // remove acentos
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // troca não-alfanum por '-'
    .replace(/^-+|-+$/g, "") // trim '-'
    .replace(/-{2,}/g, "-"); // colapsa '--'
}
