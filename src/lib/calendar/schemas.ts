import { z } from "zod";

export const EventIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const EventQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  unitId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  sort: z.enum(["asc", "desc"]).optional(),
});

export const EventCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(), // 👈 adicionado
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  all_day: z.boolean().optional().default(false),
  color: z.string().max(20).optional(),
  unit_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const EventUpdateSchema = EventCreateSchema.partial();
