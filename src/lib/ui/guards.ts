// src/lib/ui/guards.ts
import { PLATFORM_ADMIN } from "@/lib/types/roles";

export function isPlatformAdminProfile(p?: { global_role?: string }) {
  return p?.global_role === PLATFORM_ADMIN;
}