// src/components/layout/app-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import {
  AppWindowMac,
  UserCog,
  Settings,
  Warehouse,
  Calendar,
  Group,
  LaptopMinimalCheck,
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

  // Extract orgSlug from pathname when in /orgs/[orgSlug]/*
  const orgSlugMatch = pathname.match(/^\/orgs\/([^/]+)/);
  const orgSlugFromPath = orgSlugMatch ? orgSlugMatch[1] : null;
  const effectiveOrgSlug = activeOrgSlug || orgSlugFromPath || null;

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
                  className="object-contain"
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
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start "
                  asChild>
                  <Link href="/dashboard">
                    <AppWindowMac size={20} />
                    <span className="ml-2">Painel</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start "
                  asChild>
                  <Link href="/calendar">
                    <Calendar size={20} />
                    <span className="ml-2">Calendário</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start "
                  asChild>
                  <Link href="/design-editor">
                    <LaptopMinimalCheck size={20} />
                    <span className="ml-2">Designer</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild>
                  <Link href="/users">
                    <UserCog size={20} />
                    <span className="ml-2">Usuários</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild>
                  <Link href="/groups">
                    <Group size={20} />
                    <span className="ml-2">Grupos</span>
                  </Link>
                </Button>
              </SidebarMenuItem>

              {/* Módulos de organização — sempre visíveis; rotas estáveis cuidam do redirect */}
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild>
                  <Link href="/settings">
                    <Settings size={20} />
                    <span className="ml-2">Configuração</span>
                  </Link>
                </Button>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild>
                  <Link href="/units">
                    <Warehouse size={20} />
                    <span className="ml-2">Unidades</span>
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
