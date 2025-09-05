// src/components/design-editor/utils/is-input-like.ts
export function isInputLike(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;

  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;

  // contenteditable no próprio elemento ou em ancestrais
  if (el.isContentEditable) return true;
  if (el.closest?.('[contenteditable="true"]')) return true;

  // roles de widgets de texto
  const role = el.getAttribute?.("role");
  if (role && ["textbox", "combobox", "searchbox", "spinbutton"].includes(role))
    return true;

  return false;
}
