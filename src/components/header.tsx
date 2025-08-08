'use client';

import Link from "next/link";
import { UserNav } from "./user-nav";
import { Button } from "./ui/button";
import { Mountain } from "lucide-react";
import type { Profile } from "@/lib/types";
import type { Profile } from "@/lib/types";

interface HeaderProps {
  user: Profile | null;
}

export function Header({ user }: HeaderProps) {
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b">
      <div className="px-12 flex items-center h-16">
        <Link href="/" className="flex items-center mr-6 font-bold">
          <Mountain className="w-6 h-6 mr-2" />
          <span className="font-headline">Users</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {isAdmin && (
            <Link
              href="/admin"
              className="font-medium transition-colors text-foreground/60 hover:text-foreground/80">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center justify-end flex-1">
          {user ? (
            <UserNav user={user} />
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
