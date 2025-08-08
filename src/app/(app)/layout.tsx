import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";
import "../globals.css";
import { cn } from "@/lib/utils";

import type { Profile } from "@/lib/types";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile in AppLayout:", profileError);
    // Handle error, maybe redirect to an error page or show a message
  }

  const userProfile: Profile = {
    id: user.id,
    email: user.email,
    full_name: profileData?.full_name || user.user_metadata.name || "",
    phone: profileData?.phone || "",
    avatar_url: profileData?.avatar_url || "",
    role: profileData?.role || user.user_metadata.role || "user",
    created_at: user.created_at,
  };

  return (
    <html lang="pt-BR">
      <head></head>
      <body className={cn("font-body antialiased h-full bg-background")}>
        <div className="flex flex-col min-h-screen">
          <Header user={userProfile} />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
