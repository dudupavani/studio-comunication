// src/lib/validation/users.ts
import { z } from "zod";
import { APP_ROLES, ORG_ROLES, UNIT_ROLES } from "@/lib/types/roles";

export const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  org_id: z.string().uuid(),
  org_role: z.enum(ORG_ROLES).nullable().optional(), // inclui "org_master"
  unit_id: z.string().uuid().nullable().optional(),
  unit_role: z.enum(UNIT_ROLES).nullable().optional(),
  // Se tiver um campo único de role
  role: z.enum(APP_ROLES).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
