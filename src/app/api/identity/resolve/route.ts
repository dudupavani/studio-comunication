// src/app/api/identity/resolve/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";

const Body = z.object({
  userIds: z.array(z.string().uuid()).min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userIds } = Body.parse(body);

    const uniqueIds = Array.from(new Set(userIds));
    const supabase = createServiceClient();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", uniqueIds);

    if (profilesError) {
      console.warn("IDENTITY resolve profile lookup error", profilesError);
    }

    const byId: Record<
      string,
      {
        user_id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
        org_id: string | null;
        title: string | null;
      }
    > = {};

    (profiles ?? []).forEach((profile: any) => {
      if (!profile?.id) return;
      byId[profile.id] = {
        user_id: profile.id,
        full_name: profile.full_name ?? null,
        email: null,
        avatar_url: profile.avatar_url ?? null,
        org_id: null,
        title: null,
      };
    });

    const missing = uniqueIds.filter(
      (id) => !byId[id] || !byId[id].full_name || !byId[id].avatar_url || !byId[id].email
    );

    if (missing.length) {
      await Promise.all(
        missing.map(async (id) => {
          try {
            const { data, error } = await supabase.auth.admin.getUserById(id);
            if (error || !data?.user) return;
            const metadata = (data.user.user_metadata ?? {}) as Record<string, any>;
            const name = (metadata?.name as string | undefined) ?? null;
            const avatarUrl =
              (metadata?.avatar_url as string | undefined) ?? null;
            const email = data.user.email ?? null;

            if (!byId[id]) {
              byId[id] = {
                user_id: id,
                full_name: name,
                email,
                avatar_url: avatarUrl,
                org_id: null,
                title: null,
              };
              return;
            }

            if (!byId[id].full_name) {
              byId[id].full_name = name;
            }
            if (!byId[id].email) {
              byId[id].email = email;
            }
            if (!byId[id].avatar_url) {
              byId[id].avatar_url = avatarUrl;
            }
          } catch (err) {
            console.warn("IDENTITY resolve admin lookup error", err);
          }
        })
      );
    }

    try {
      const { data: cargoRows, error: cargoError } = await supabase
        .from("employee_profile")
        .select("user_id, cargo")
        .in("user_id", uniqueIds);

      if (cargoError) {
        console.warn("IDENTITY resolve cargo lookup error", cargoError);
      } else {
        (cargoRows ?? []).forEach((row: any) => {
          const userId = row?.user_id as string | undefined;
          if (!userId) return;
          const cargo = (row?.cargo as string | null) ?? null;
          if (byId[userId]) {
            byId[userId].title = cargo ?? byId[userId].title ?? null;
          } else {
            byId[userId] = {
              user_id: userId,
              full_name: null,
              email: null,
              avatar_url: null,
              org_id: null,
              title: cargo,
            };
          }
        });
      }
    } catch (err) {
      console.warn("IDENTITY resolve cargo failure", err);
    }

    // Cache leve (privado) para aliviar refresh rápido de página
    return NextResponse.json(
      { byId },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: toLoggableError(err) }, { status: 400 });
  }
}
