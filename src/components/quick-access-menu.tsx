"use client";

import Link from "next/link";
import {
  Settings,
  Users,
  Group,
  Users2,
  Building,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const LINKS = [
  { href: "/users", label: "Usuários", icon: Users },
  { href: "/groups", label: "Grupos", icon: Group },
  { href: "/teams", label: "Equipes", icon: Users2 },
  { href: "/units", label: "Unidades", icon: Building },
  { href: "/settings", label: "Organização", icon: Building2 },
];

export function QuickAccessMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Atalhos rápidos">
          <Settings />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Configurações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LINKS.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link
              href={item.href}
              className="flex items-center gap-2 cursor-pointer">
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
