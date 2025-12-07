// src/app/api/calendar/events/[id]/route.ts
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { EventIdParamSchema, EventUpdateSchema } from "@/lib/calendar/schemas";
import { parseJson, validateBody } from "@/lib/http/validate";
import { problem } from "@/lib/http/problem";
import { NextResponse } from "next/server";
import { z } from "zod";

type EventUpdate = z.infer<typeof EventUpdateSchema>;

function isRlsForbidden(error: any): boolean {
  const msg = String(error?.message || "").toLowerCase();
  // Códigos/mensagens comuns quando o RLS nega a operação
  return (
    error?.code === "42501" || // insufficient_privilege
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("violates row-level security")
  );
}

// ---- PATCH /api/calendar/events/:id
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/calendar/events/[id]">
) {
  const params = await context.params;
  const parsedId = EventIdParamSchema.safeParse(params);
  if (!parsedId.success) {
    return problem(400, "CAL-VAL-003", "Invalid event id", undefined, {
      issues: parsedId.error.issues,
    });
  }

  try {
    const supabase = createClient();
    const authContext = await getAuthContext();

    if (!authContext?.userId) {
      return problem(401, "CAL-AUTH-006", "Unauthorized");
    }

    // 1) Buscar o evento para autorização (defesa em profundidade)
    const { id } = params;
    const { data: current, error: fetchErr } = await supabase
      .from("calendar_events")
      .select("id, org_id, created_by")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      // Se o SELECT falhar por RLS, tratamos como 404 para não vazar informação
      if (isRlsForbidden(fetchErr)) {
        return problem(404, "CAL-NOT-FOUND-001", "Event not found");
      }
      console.error(`Error fetching calendar event ${params.id}:`, fetchErr);
      return problem(500, "CAL-SERVER-010", "Failed to fetch calendar event");
    }

    if (!current) {
      return problem(404, "CAL-NOT-FOUND-001", "Event not found");
    }

    // 2) Validar corpo
    const json = await parseJson(request);
    const parsed = validateBody(EventUpdateSchema, json);
    if (!parsed.ok) {
      return problem(400, "CAL-VAL-004", "Invalid body", undefined, {
        issues: parsed.issues,
      });
    }

    const input = parsed.data as EventUpdate;

    // 3) Montar payload com conversão de datas quando presentes
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined)
      updatePayload.description = input.description ?? null; // 👈 adicionado
    if (input.start_time !== undefined)
      updatePayload.start_time = input.start_time
        ? new Date(input.start_time).toISOString()
        : null;
    if (input.end_time !== undefined)
      updatePayload.end_time = input.end_time
        ? new Date(input.end_time).toISOString()
        : null;
    if (input.all_day !== undefined) updatePayload.all_day = !!input.all_day;
    if (input.color !== undefined) updatePayload.color = input.color ?? null;
    if (input.unit_id !== undefined)
      updatePayload.unit_id = input.unit_id ?? null;
    if (input.metadata !== undefined)
      updatePayload.metadata = input.metadata ?? null;

    // 4) Executar UPDATE
    const { data, error } = await supabase
      .from("calendar_events")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Se o usuário não for criador nem admin, o RLS vai negar aqui
      if (isRlsForbidden(error)) {
        return problem(403, "CAL-AUTH-008", "Forbidden");
      }
      console.error(`Error updating calendar event ${params.id}:`, error);
      return problem(500, "CAL-SERVER-006", "Failed to update calendar event");
    }

    if (!data) {
      // Pode acontecer se o RLS bloquear silenciosamente e não retornar erro explícito
      return problem(403, "CAL-AUTH-009", "Forbidden");
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error(
      `Unexpected error in PATCH /api/calendar/events/${params.id}:`,
      err
    );
    return problem(500, "CAL-SERVER-007", "Internal server error");
  }
}

// ---- DELETE /api/calendar/events/:id
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/calendar/events/[id]">
) {
  const params = await context.params;
  const parsedId = EventIdParamSchema.safeParse(params);
  if (!parsedId.success) {
    return problem(400, "CAL-VAL-005", "Invalid event id", undefined, {
      issues: parsedId.error.issues,
    });
  }

  try {
    const supabase = createClient();
    const authContext = await getAuthContext();

    if (!authContext?.userId) {
      return problem(401, "CAL-AUTH-007", "Unauthorized");
    }

    // 1) Buscar o evento para autorização (defesa em profundidade)
    const { data: current, error: fetchErr } = await supabase
      .from("calendar_events")
      .select("id, org_id, created_by")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchErr) {
      if (isRlsForbidden(fetchErr)) {
        return problem(404, "CAL-NOT-FOUND-002", "Event not found");
      }
      console.error(`Error fetching calendar event ${params.id}:`, fetchErr);
      return problem(500, "CAL-SERVER-011", "Failed to fetch calendar event");
    }

    if (!current) {
      return problem(404, "CAL-NOT-FOUND-002", "Event not found");
    }

    // 2) Executar DELETE
    const { data, error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", params.id)
      .select("id")
      .maybeSingle();

    if (error) {
      if (isRlsForbidden(error)) {
        return problem(403, "CAL-AUTH-010", "Forbidden");
      }
      console.error(`Error deleting calendar event ${params.id}:`, error);
      return problem(500, "CAL-SERVER-008", "Failed to delete calendar event");
    }

    if (!data) {
      // Pode ocorrer quando o RLS bloqueia sem erro explícito ou o registro já não existe
      return problem(404, "CAL-NOT-FOUND-002", "Event not found");
    }

    return NextResponse.json({
      data: { message: "Event deleted successfully" },
      error: null,
    });
  } catch (err) {
    console.error(
      `Unexpected error in DELETE /api/calendar/events/${params.id}:`,
      err
    );
    return problem(500, "CAL-SERVER-009", "Internal server error");
  }
}
