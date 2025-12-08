import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/messages/auth-context";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import {
  ANNOUNCEMENT_TONES,
  type AnnouncementTone,
} from "@/lib/ai/announcement-tones";
import { getGroqClient, DEFAULT_MODEL } from "@/lib/ai/clients/groq";

const RequestSchema = z.object({
  briefing: z.string().min(10, "briefing-too-short"),
  tone: z.enum([
    "formal_institucional",
    "amigavel",
    "motivacional",
    "direto_objetivo",
  ]),
});

const SYSTEM_MESSAGE = `Você é um assistente especializado em criar comunicados internos corporativos.
Sua tarefa é transformar um briefing curto em um comunicado completo e retornar exclusivamente um JSON contendo title e body.

Regras obrigatórias:

Escreva sempre em português do Brasil.

Não invente fatos: use apenas informações do briefing.

Não crie datas, horários, locais, regras ou números inexistentes.

Estrutura do JSON:

title: texto curto e claro resumindo o comunicado.

body: 2 a 4 parágrafos curtos em texto simples.

Não usar HTML, markdown, listas, negrito ou formatação.

Não explicar o que está fazendo.

Não adicionar texto fora do JSON.

A resposta deve ser somente JSON válido.

Exemplo ilustrativo de formato:
{
"title": "Título aqui",
"body": "Parágrafo 1...\\n\\nParágrafo 2..."
}`;

export async function POST(req: Request) {
  const supabase = createServerClientWithCookies();
  const auth = await getAuthContext(supabase);
  if (!auth?.userId) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }
  if (!(auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: z.infer<typeof RequestSchema>;
  try {
    const body = await req.json();
    parsed = RequestSchema.parse(body);
  } catch (err: any) {
    return NextResponse.json(
      { error: "invalid_request", details: err?.message ?? null },
      { status: 400 }
    );
  }

  const tone = ANNOUNCEMENT_TONES[parsed.tone as AnnouncementTone];
  if (!tone) {
    return NextResponse.json(
      { error: "invalid_tone" },
      { status: 400 }
    );
  }

  const groq = getGroqClient();

  const userMessage = `Briefing do comunicado:
${parsed.briefing}

Tom de voz desejado:
${tone.description}

Instruções finais:

Retornar apenas um JSON com title e body.

Não repetir o briefing.

Não adicionar explicações.

Não escrever nada fora do JSON.`;

  const aiCall = async () => {
    const response = await groq.chatCompletion({
      model: DEFAULT_MODEL,
      temperature: tone.temperature,
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: userMessage },
      ],
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("empty_ai_response");
    }

    let parsedJson: { title?: string; body?: string };
    try {
      parsedJson = JSON.parse(content);
    } catch (err) {
      throw new Error("invalid_json_response");
    }

    const title = typeof parsedJson.title === "string" ? parsedJson.title.trim() : "";
    const body = typeof parsedJson.body === "string" ? parsedJson.body.trim() : "";

    if (!title || !body) {
      throw new Error("missing_fields");
    }

    return { title, body };
  };

  const timeoutMs = 10000;

  try {
    const result = await Promise.race([
      aiCall(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("ROUTE_AI_ERROR generate comunicado:", err);
    return NextResponse.json(
      { error: "generation_failed" },
      { status: 500 }
    );
  }
}
