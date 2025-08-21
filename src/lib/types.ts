// src/lib/types.ts

export interface Profile {
  id: string;
  email: string;
  full_name: string; // ← adiciona full_name
  global_role: 'platform_admin' | 'platform_support' | null;
  created_at: string;
  phone?: string | null; // ← adiciona phone (opcional)
  avatar_url?: string | null; // ← adiciona avatar_url (opcional)
}
