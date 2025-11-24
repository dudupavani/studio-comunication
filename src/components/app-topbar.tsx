"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Profile } from "@/lib/types";
import { UserMenu } from "@/components/user-menu";
import { Grid3x3 } from "lucide-react";

export function AppTopbar({ user }: { user: Profile }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-4 w-full">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Users</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Atalhos">
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Atalhos rápidos</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: "/users", label: "Usuários" },
                  { href: "/groups", label: "Grupos" },
                  { href: "/teams", label: "Equipes" },
                  { href: "/units", label: "Unidades" },
                ].map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button variant="secondary" className="w-full">
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <UserMenu user={user} />
          dddsd
        </div>
      </div>
    </header>
  );
}
