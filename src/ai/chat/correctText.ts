import { getGroqClient } from "@/lib/ai/clients/groq";

const MAX_INPUT_LENGTH = 800;
const PROMPT_PREFIX =
  "Reescreva o texto abaixo seguindo o português brasileiro, corrigindo erros gramaticais, mantendo o mesmo significado e um tom natural:\n\n";

export async function correctText(input: string): Promise<string> {
  const trimmed = typeof input === "string" ? input.trim() : "";
  if (!trimmed) {
    throw new Error("EMPTY_INPUT");
  }

  const limitedInput =
    trimmed.length > MAX_INPUT_LENGTH
      ? `${trimmed.slice(0, MAX_INPUT_LENGTH)}…`
      : trimmed;

  const prompt = `${PROMPT_PREFIX}${limitedInput}`;

  try {
    const groq = getGroqClient();
    const response = await groq.chatCompletion({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const corrected = response.choices?.[0]?.message?.content;
    if (!corrected) {
      throw new Error("AI_ERROR");
    }

    return corrected.trim();
  } catch (err) {
    console.error("GROQ_INTERNAL_ERROR:", err);
    throw err;
  }
}
