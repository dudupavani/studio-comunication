// src/app/api/design-files/[id]/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service"; // usa SERVICE_ROLE_KEY

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userClient = createRouteHandlerClient({ cookies });
  const adminClient = createServiceClient();

  const { data, error } = await userClient
    .from("design_files")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Not found" },
      { status: 404 }
    );
  }

  let thumbnail_url: string | null = null;
  if (data.thumbnail_path) {
    const { data: signed } = await adminClient.storage
      .from("design-thumbnails")
      .createSignedUrl(data.thumbnail_path, 3600);
    thumbnail_url = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ ...data, thumbnail_url });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userClient = createRouteHandlerClient({ cookies });
  const adminClient = createServiceClient();
  const body = await req.json();

  let thumbnail_path: string | undefined = undefined;

  if (body.thumbnail) {
    const base64 = body.thumbnail.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const path = `${params.id}.png`;

    const { error: uploadError } = await adminClient.storage
      .from("design-thumbnails")
      .upload(path, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    thumbnail_path = path;
  }

  const updateData: any = {
    title: body.title,
    data: body.data,
  };
  if (thumbnail_path) updateData.thumbnail_path = thumbnail_path;

  const { data, error } = await userClient
    .from("design_files")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userClient = createRouteHandlerClient({ cookies });

  const { error } = await userClient
    .from("design_files")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
