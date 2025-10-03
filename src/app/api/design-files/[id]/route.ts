import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

// evita cache e silencia warnings de rota dinâmica
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper: cliente de usuário com cookies assíncronos (compatível com @supabase/auth-helpers-nextjs d.ts)
function getUserClient() {
  return createRouteHandlerClient({
    cookies: async () => cookies(),
  });
}

// GET /api/design-files/[id]
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params; // ✅ params aguardado
  const userClient = getUserClient(); // ✅ cookies via função async
  const adminClient = createServiceClient();

  const { data, error } = await userClient
    .from("design_files")
    .select("*")
    .eq("id", id)
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

// PUT /api/design-files/[id]
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params; // ✅ params aguardado
  const userClient = getUserClient(); // ✅ cookies via função async
  const adminClient = createServiceClient();
  const body = await req.json();

  let thumbnail_path: string | undefined;

  if (body.thumbnail) {
    const base64 = body.thumbnail.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const path = `${id}.png`;

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

  const updateData: Record<string, any> = {
    title: body.title,
    data: body.data,
  };
  if (thumbnail_path) updateData.thumbnail_path = thumbnail_path;

  const { data, error } = await userClient
    .from("design_files")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/design-files/[id]
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params; // ✅ params aguardado
  const userClient = getUserClient(); // ✅ cookies via função async
  const adminClient = createServiceClient();

  // Buscar o registro antes de apagar
  const { data: file, error: fetchError } = await userClient
    .from("design_files")
    .select("thumbnail_path")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Remover thumbnail se existir
  if (file?.thumbnail_path) {
    const { error: storageError } = await adminClient.storage
      .from("design-thumbnails")
      .remove([file.thumbnail_path]);
    if (storageError) {
      console.error("Erro ao remover thumbnail:", storageError.message);
      // segue sem falhar a requisição
    }
  }

  // Remover o registro
  const { error } = await userClient.from("design_files").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
