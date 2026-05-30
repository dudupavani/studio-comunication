"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { GlobalHeaderActions } from "@/components/global-header-actions";
import ModuleTitle from "@/components/modules-title";
import { Separator } from "@/components/ui/separator";
import type { Profile } from "@/lib/types";

type AppShellHeaderProps = {
  user: Profile;
};

export function AppShellHeader({ user }: AppShellHeaderProps) {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith("/comunidades")) {
    return null;
  }

  return (
    <header className="flex shrink-0 items-center gap-2 border-b py-2">
      <div className="flex w-full items-center gap-2 px-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt="Logo"
            width={32}
            height={32}
            className="object-contain"
          />
        </Link>
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <ModuleTitle />
        <GlobalHeaderActions user={user} />
      </div>
    </header>
  );
}
