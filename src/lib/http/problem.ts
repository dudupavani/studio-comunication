import { NextResponse } from "next/server";

export function problem(
  status: number,
  code: string,
  title: string,
  detail?: string,
  extras?: Record<string, any>
) {
  const body = {
    type: `https://httpstatuses.com/${status}`,
    title,
    status,
    detail,
    code,
    ...extras,
  };

  return NextResponse.json(body, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}
