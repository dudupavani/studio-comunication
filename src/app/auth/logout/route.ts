"use server";
import { signOut } from "@/lib/actions/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  await signOut();
  return new Response(null, {
    status: 302,
    headers: { Location: "/auth/login" },
  });
}
