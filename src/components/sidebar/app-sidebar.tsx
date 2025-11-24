// src/components/layout/app-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useAuthContext } from "@/hooks/use-auth-context";

import {
  AppWindowMac,
  UserCog,
  Settings,
  Warehouse,
  Calendar,
  Group,
  LaptopMinimalCheck,
  MessageCircleHeart,
  Inbox,
  BookOpen,
  UsersRound,
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

export default function AppSidebar({ activeOrgSlug = null }: SidebarProps) {
  const pathname = usePathname();
  const { auth } = useAuthContext();

  // Extract orgSlug from pathname when in /orgs/[orgSlug]/*
  const orgSlugMatch = pathname.match(/^\/orgs\/([^/]+)/);
  const orgSlugFromPath = orgSlugMatch ? orgSlugMatch[1] : null;
  const effectiveOrgSlug = activeOrgSlug || orgSlugFromPath || null;

  const canSeeMessages = !auth
    ? true
    : auth.platformRole === "platform_admin" || !!auth.orgRole;

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
                      <Link href="/inbox">
                        <Inbox size={20} />
                        <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                          Inbox
                        </span>
                      </Link>
                    </Button>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                      asChild>
                      <Link href="/messages">
                        <MessageCircleHeart size={20} />
                        <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                          Mensagens
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
                  <Link href="/dashboard">
                    <AppWindowMac size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Dashboard
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/users">
                    <UserCog size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Usuários
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/groups">
                    <Group size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Grupos
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/teams">
                    <UsersRound size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Equipes
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>

              {/* Módulos de organização — sempre visíveis; rotas estáveis cuidam do redirect */}
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/settings">
                    <Settings size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Configuração
                    </span>
                  </Link>
                </Button>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-gray-800 hover:text-white transition-colors duration-200 ease-out group-data-[state=collapsed]:pl-3.5"
                  asChild>
                  <Link href="/units">
                    <Warehouse size={20} />
                    <span className="ml-2 transition-opacity duration-200 ease-in-out group-data-[state=collapsed]:opacity-0">
                      Unidades
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
