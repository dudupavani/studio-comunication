// src/app/auth/logout/route.ts
import { signOut } from "@/lib/actions/auth";
import { NextResponse } from "next/server";

function absolute(req: Request, path: string) {
  const { origin } = new URL(req.url);
  return new URL(path, origin);
}

async function handle(request: Request) {
  await signOut();
  // garanta redirecionamento correto SEM o /auth no caminho
  return NextResponse.redirect(absolute(request, "/login"), { status: 302 });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
