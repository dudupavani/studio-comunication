// impede SSG/Export deste layout (depende de auth/cookies)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
// garante Node.js runtime (e não Edge) neste layout
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

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return redirect("/profile");
  }

  if (profileData?.role !== "admin") {
    return redirect("/profile");
  }

  return <>{children}</>;
}
