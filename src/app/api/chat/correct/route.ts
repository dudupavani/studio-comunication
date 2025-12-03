import { NextResponse } from "next/server";
import { correctText } from "@/ai/chat/correctText";

const ROUTE_TIMEOUT_MS = 10_000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = body?.text;

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "invalid_input" },
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("TIMEOUT")), ROUTE_TIMEOUT_MS);
  });

  try {
    const corrected = await Promise.race<string>([
      correctText(text),
      timeoutPromise,
    ]);

    return NextResponse.json(
      { corrected },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("ROUTE_CORRECT_ERROR:", err);
    return NextResponse.json(
      { error: "AI_ERROR" },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
