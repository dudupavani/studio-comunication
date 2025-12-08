export type AnnouncementTone =
  | "formal_institucional"
  | "amigavel"
  | "motivacional"
  | "direto_objetivo";

export const ANNOUNCEMENT_TONES: Record<
  AnnouncementTone,
  { description: string; temperature: number }
> = {
  formal_institucional: {
    description: "Linguagem profissional, objetiva, sem gírias.",
    temperature: 0.3,
  },
  amigavel: {
    description: "Linguagem leve, próxima, acolhedora, ainda profissional.",
    temperature: 0.6,
  },
  motivacional: {
    description: "Tom positivo e encorajador, sem exageros.",
    temperature: 0.7,
  },
  direto_objetivo: {
    description: "Sucinto, direto, sem floreio.",
    temperature: 0.2,
  },
};
