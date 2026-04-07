"use client";

import Link from "next/link";
import { Bell, Bookmark } from "lucide-react";

import { QuickAccessMenu } from "@/components/quick-access-menu";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

type GlobalHeaderActionsProps = {
  user: Profile;
};

export function GlobalHeaderActions({ user }: GlobalHeaderActionsProps) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href="/inbox" aria-label="Inbox">
          <Bell />
        </Link>
      </Button>
      <QuickAccessMenu />
      <UserMenu user={user} />
    </div>
  );
}
