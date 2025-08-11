import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

import AppSidebar from "@/components/sidebar/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/user-menu";
import ModuleTitle from "@/components/modules-title";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile in AppLayout:", profileError);
  }

  const userProfile: Profile = {
    id: user.id,
    email: user.email,
    full_name: profileData?.full_name || user.user_metadata?.name || "",
    phone: profileData?.phone || "",
    avatar_url: profileData?.avatar_url || "",
    role: profileData?.role || user.user_metadata?.role || "user",
    created_at: user.created_at,
  };

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />

      <SidebarInset className="min-h-screen">
        {/* Topbar */}
        <header className="flex py-2 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <ModuleTitle />

            <div className="ml-auto">
              <UserMenu user={userProfile} />
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <div className={cn("flex flex-1 flex-col")}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
