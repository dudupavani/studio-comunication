// src/lib/ui/guards.ts
import { PLATFORM_ADMIN } from "@/lib/types/roles";

export function isPlatformAdminProfile(p?: { role?: string; global_role?: string }) {
  return p?.role === PLATFORM_ADMIN || p?.global_role === PLATFORM_ADMIN;
}