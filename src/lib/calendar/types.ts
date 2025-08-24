// src/lib/calendar/types.ts
import type { Json } from "@/lib/supabase/types";

/**
 * Linha do banco (Supabase) para a tabela `calendar_events`.
 * Use este tipo para dados vindos/indo direto ao DB.
 */
export type CalendarEventDTO = {
  id: string;
  org_id: string;
  unit_id: string | null;
  title: string;
  description: string | null;
  start_time: string; // ISO string
  end_time: string; // ISO string
  all_day: boolean;
  color: string | null;
  metadata: Json | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
};

/**
 * Payload que vem da UI para CRIAR um evento.
 * Observação: org_id e created_by são preenchidos no servidor (auth context).
 */
export type CalendarEventCreateInput = {
  title: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  all_day?: boolean;
  unit_id?: string | null;
  color?: string | null;
  description?: string | null;
  metadata?: Json | null;
};

/**
 * Payload que o servidor realmente insere no DB após enriquecer com org/user.
 * Útil para tipar o insert no handler (POST).
 */
export type CalendarEventInsertDb = {
  org_id: string;
  created_by: string;
} & Required<
  Pick<CalendarEventCreateInput, "title" | "start_time" | "end_time">
> &
  Omit<CalendarEventCreateInput, "title" | "start_time" | "end_time">;

/**
 * Payload de atualização parcial (PATCH) vindo da UI.
 * O handler deve validar escopo (org) e permissão antes de aplicar.
 */
export type CalendarEventUpdateInput = Partial<{
  title: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  all_day: boolean;
  unit_id: string | null;
  color: string | null;
  description: string | null;
  metadata: Json | null;
}>;

/**
 * Tipo de evento esperado pelo react-big-calendar.
 * Mantemos o DTO original no `resource` para modais, tooltips, etc.
 */
export type RbcEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: CalendarEventDTO;
};

/**
 * Query params aceitos pelo GET /api/calendar/events.
 */
export type CalendarQueryParams = {
  from: string; // ISO string
  to: string; // ISO string
  orgId?: string;
  unitId?: string;
};
