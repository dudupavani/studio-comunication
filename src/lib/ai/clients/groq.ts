const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MODEL = "llama-3.1-8b-instant";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqChatCompletionRequest = {
  model?: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
};

type GroqChatCompletionChoice = {
  message?: {
    role?: string;
    content?: string | null;
  } | null;
};

type GroqChatCompletionResponse = {
  choices: GroqChatCompletionChoice[];
};

export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const chatCompletion = async (
    payload: GroqChatCompletionRequest
  ): Promise<GroqChatCompletionResponse> => {
    const { model, ...rest } = payload;
    const body = {
      ...rest,
      model: model ?? DEFAULT_MODEL,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const suffix = errorText ? `: ${errorText}` : "";
        throw new Error(`Groq request failed (${response.status})${suffix}`);
      }

      return (await response.json()) as GroqChatCompletionResponse;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    chatCompletion,
  };
}
