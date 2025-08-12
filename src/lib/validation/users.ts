// src/lib/validation/users.ts
import { z } from "zod";
import { APP_ROLES } from "@/lib/types/roles";

export const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  org_id: z.string().uuid(),
  org_role: z.enum(["org_admin"]).nullable().optional(),
  unit_id: z.string().uuid().nullable().optional(),
  unit_role: z.enum(["unit_master"]).nullable().optional(),
  // Se tiver um campo único de role
  role: z.enum(APP_ROLES).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
