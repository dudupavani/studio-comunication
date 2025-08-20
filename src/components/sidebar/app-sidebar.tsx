// src/components/layout/app-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import { Building2, AppWindowMac, UserCog, Settings, Building, User } from "lucide-react";

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
      <SidebarHeader>
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
                    <AppWindowMac />
                    Painel
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild>
                  <Link href="/admin/users">
                    <UserCog />
                    <span className="ml-2">Gerenciar usuários</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              
              {/* Módulos de organização — sempre visíveis; rotas estáveis cuidam do redirect */}
              <SidebarMenuItem>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/settings">
                    <Settings />
                    <span className="ml-2">Configuração</span>
                  </Link>
                </Button>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/units">
                    <Building />
                    <span className="ml-2">Unidades</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              
              {/* Perfil do usuário */}
              <SidebarMenuItem>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/profile">
                    <User />
                    <span className="ml-2">Perfil</span>
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
