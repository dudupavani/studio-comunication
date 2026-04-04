// src/components/layout/app-sidebar.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useNotificationBadges } from "@/hooks/use-notification-badges";

import {
  AppWindowMac,
  Calendar,
  LaptopMinimalCheck,
  MessageSquare,
  Megaphone,
  Inbox,
  BookOpen,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type SidebarProps = {
  activeOrgSlug?: string | null;
};

const formatBadgeValue = (value: number) =>
  value > 99 ? "99+" : String(value);

export default function AppSidebar({ activeOrgSlug = null }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const { auth, loading: authLoading } = useAuthContext();

  // Extract orgSlug from pathname when in /orgs/[orgSlug]/*
  const orgSlugMatch = pathname.match(/^\/orgs\/([^/]+)/);
  const orgSlugFromPath = orgSlugMatch ? orgSlugMatch[1] : null;
  const effectiveOrgSlug = activeOrgSlug || orgSlugFromPath || null;

  const canSeeMessages = !auth
    ? true
    : auth.platformRole === "platform_admin" || !!auth.orgRole;

  const { counts, markScopeAsRead } = useNotificationBadges({
    enabled: !authLoading && !!auth,
    pollMs: 20_000,
    userId: auth?.userId ?? null,
  });

  useEffect(() => {
    if (!auth) return;
    if (pathname.startsWith("/inbox")) {
      markScopeAsRead("inbox");
    }
  }, [auth, pathname, markScopeAsRead]);

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="mb-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard">
              <div>
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="object-contain min-w-[40px] min-h-[40px]"
                />
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {canSeeMessages && (
                <>
                  <SidebarMenuItem>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                      asChild>
                      <Link
                        href="/inbox"
                        className="flex w-full items-center gap-2">
                        <span className="relative inline-flex">
                          <Inbox size={20} />
                          {counts.inbox > 0 ? (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                          ) : null}
                        </span>
                        <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                          Inbox
                        </span>
                        {counts.inbox > 0 ? (
                          <span className="ml-auto rounded-full bg-destructive/15 px-2 text-xs font-semibold text-destructive group-data-[state=collapsed]:hidden">
                            {formatBadgeValue(counts.inbox)}
                          </span>
                        ) : null}
                      </Link>
                    </Button>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                      asChild>
                      <Link
                        href="/chats"
                        className="flex w-full items-center gap-2">
                        <span className="relative inline-flex">
                          <MessageSquare size={20} />
                          {counts.chats > 0 ? (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                          ) : null}
                        </span>
                        <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                          Chats
                        </span>
                        {counts.chats > 0 ? (
                          <span className="absolute top-2.5 right-2 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] rounded-full bg-green-600 text-[11px] font-semibold text-center text-white ">
                            {formatBadgeValue(counts.chats)}
                          </span>
                        ) : null}
                      </Link>
                    </Button>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                      asChild>
                      <Link href="/comunicados">
                        <Megaphone size={20} />
                        <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                          Comunicados
                        </span>
                      </Link>
                    </Button>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                      asChild>
                      <Link href="/comunidades">
                        <Users size={20} />
                        <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                          Comunidades
                        </span>
                      </Link>
                    </Button>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/calendar">
                    <Calendar size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Calendário
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/design-editor">
                    <LaptopMinimalCheck size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Designer
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/learning">
                    <BookOpen size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Cursos
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/dashboard">
                    <AppWindowMac size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Dashboard
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>{/* área inferior (ex: usuário / sair) */}</SidebarFooter>
    </Sidebar>
  );
}
