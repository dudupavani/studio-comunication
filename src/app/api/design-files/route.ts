// src/app/api/design-files/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const userClient = createRouteHandlerClient({ cookies });
  const adminClient = createServiceClient();

  const { data, error } = await userClient
    .from("design_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao buscar arquivos" },
      { status: 500 }
    );
  }

  // gera signed URLs para cada arquivo que tem thumbnail_path
  const filesWithUrls = await Promise.all(
    data.map(async (file) => {
      let thumbnail_url: string | null = null;
      if (file.thumbnail_path) {
        const { data: signed } = await adminClient.storage
          .from("design-thumbnails")
          .createSignedUrl(file.thumbnail_path, 3600);
        thumbnail_url = signed?.signedUrl ?? null;
      }
      return { ...file, thumbnail_url };
    })
  );

  return NextResponse.json(filesWithUrls);
}

export async function POST(req: Request) {
  const userClient = createRouteHandlerClient({ cookies });
  const body = await req.json();

  const { data, error } = await userClient
    .from("design_files")
    .insert([
      {
        org_id: body.org_id,
        user_id: body.user_id,
        title: body.title ?? "Novo arquivo",
        data: body.data ?? {},
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
