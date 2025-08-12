// app/(app)/admin/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Agora busca global_role
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return redirect("/profile");
  }

  // Permite apenas platform_admin
  if (profileData?.global_role !== "platform_admin") {
    return redirect("/profile");
  }

  return <>{children}</>;
}
