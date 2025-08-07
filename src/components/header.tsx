import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { UserNav } from "./user-nav";
import { Button } from "./ui/button";
import { Mountain } from "lucide-react";
import type { Profile } from "@/lib/types";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile: Profile | null = null;

  if (user) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile in header:", profileError);
    }

    userProfile = {
      id: user.id,
      email: user.email,
      full_name: profileData?.full_name || user.user_metadata.name || "",
      phone: profileData?.phone || "",
      avatar_url: profileData?.avatar_url || "",
      role: profileData?.role || "user", // Alterado para buscar a role da tabela profiles
      created_at: user.created_at,
    };
  }

  const isAdmin = userProfile?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b">
      <div className="px-12 flex items-center h-16">
        <Link href="/" className="flex items-center mr-6 font-bold">
          <Mountain className="w-6 h-6 mr-2" />
          <span className="font-headline">Users</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {isAdmin && (
            <Link
              href="/admin"
              className="font-medium transition-colors text-foreground/60 hover:text-foreground/80">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center justify-end flex-1">
          {userProfile ? (
            <UserNav user={userProfile} />
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
