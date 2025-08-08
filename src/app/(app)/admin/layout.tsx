import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Profile } from "@/lib/types";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("AdminLayout: No user found, redirecting to /login");
    return redirect("/login")
  }

  console.log("AdminLayout: User found:", user.id, user.email);

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile role in AdminLayout:", profileError);
    return redirect("/profile"); // Redirect on error fetching role
  }

  console.log("AdminLayout: User role:", profileData?.role);

  if (profileData?.role !== "admin") {
    console.log("AdminLayout: User is not admin, redirecting to /profile");
    return redirect("/profile")
  }

  console.log("AdminLayout: User is admin, rendering children");

  return <>{children}</>
}