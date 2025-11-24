// src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { logError, toLoggableError } from "@/lib/log";
import { getActiveOrgForSidebar } from "@/lib/active-org";

import AppSidebar from "@/components/sidebar/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/user-menu";
import ModuleTitle from "@/components/modules-title";
import { QuickAccessMenu } from "@/components/quick-access-menu";

// ✅ SSR: finaliza convite sem mexer na UI
import FinalizeInviteSSR from "@/components/auth/finalize-invite-ssr";
// ✅ CSR fallback: garante a finalização mesmo se o SSR não rodar
import FinalizeInviteCSR from "@/components/auth/finalize-invite-csr";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG AppLayout enter");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔐 exige sessão
  if (!user) redirect("/login");

  // 🔐 força definir senha no primeiro acesso
  if (user.user_metadata?.must_set_password) {
    redirect("/auth/force-password");
  }

  const {
    data: profileData,
    error: profileError,
    status,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Só loga quando houver erro de fato (com conteúdo)
  const loggableError = toLoggableError(profileError);
  const hasRealError =
    !!profileError &&
    !!loggableError?.message &&
    loggableError.message !== "Empty error object";

  if (hasRealError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("DEBUG AppLayout profileError:", {
        message: profileError?.message,
        code: profileError?.code,
      });
    }
    logError("Error fetching profile in AppLayout:", profileError);
  }

  // Caso comum: status 200/406 e profile === null => sem registro ou bloqueado por RLS
  const noProfile = !profileData && !hasRealError;
  if (noProfile) {
    console.warn("AppLayout — profile not found or blocked by RLS", {
      status,
      userId: user.id,
    });
    // decisão de produto fica como comentário
  }

  const profileRole =
    profileData?.global_role === "platform_admin" ||
    profileData?.global_role === "platform_support"
      ? profileData?.global_role
      : null;

  const metadataRole =
    user.user_metadata?.global_role === "platform_admin" ||
    user.user_metadata?.global_role === "platform_support"
      ? user.user_metadata?.global_role
      : null;

  const userProfile: Profile = {
    id: user.id,
    email: user.email ?? "",
    full_name: profileData?.full_name || user.user_metadata?.name || "",
    global_role: profileRole ?? metadataRole ?? null,
    phone: profileData?.phone || "",
    avatar_url: profileData?.avatar_url || "",
    created_at: user.created_at,
  };

  // Get active organization for sidebar
  const { auth } = await getActiveOrgForSidebar();

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar activeOrgSlug={null} />

      <SidebarInset className="min-h-screen">
        {/* 🔄 Finalização automática do convite (SSR) + fallback em cliente (CSR) */}
        <FinalizeInviteSSR />
        <FinalizeInviteCSR />

        {/* Topbar */}
        <header className="flex py-2 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <ModuleTitle />

            <div className="ml-auto flex items-center gap-4">
              <QuickAccessMenu />
              <UserMenu user={userProfile} />
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <div className={cn("flex flex-col")}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
