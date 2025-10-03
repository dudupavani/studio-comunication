// src/app/api/calendar/events/route.ts
import { createClient } from "../../../../lib/supabase/server";
import { getAuthContext } from "../../../../lib/auth-context";
import {
  EventQuerySchema,
  EventCreateSchema,
} from "../../../../lib/calendar/schemas";
import {
  parseJson,
  validateBody,
  validateQuery,
} from "../../../../lib/http/validate";
import { problem } from "../../../../lib/http/problem";
import { NextResponse } from "next/server";
import { z } from "zod";

type EventQuery = z.infer<typeof EventQuerySchema>;
type EventCreate = z.infer<typeof EventCreateSchema>;

// GET /api/calendar/events
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = validateQuery(EventQuerySchema, url);

  if (!parsed.ok) {
    return problem(400, "CAL-VAL-001", "Invalid query parameters", undefined, {
      issues: parsed.issues,
    });
  }

  const { from, to, unitId } = parsed.data as EventQuery;
  const orgId = url.searchParams.get("orgId");

  try {
    const supabase = createClient();
    const authContext = await getAuthContext();

    if (!authContext?.userId) {
      return problem(401, "CAL-AUTH-001", "Unauthorized");
    }

    if (orgId && orgId !== authContext.orgId) {
      return problem(403, "CAL-AUTH-002", "Forbidden");
    }

    // Correção: busca por eventos que SOBREPÕEM o intervalo solicitado:
    // start_time <= to  AND  end_time >= from
    let query = supabase
      .from("calendar_events")
      .select("*")
      .lte("start_time", to.toISOString())
      .gte("end_time", from.toISOString())
      .order("start_time", { ascending: true });

    if (orgId) {
      query = query.eq("org_id", orgId);
    }
    if (unitId) {
      query = query.eq("unit_id", unitId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching calendar events:", error);
      return problem(500, "CAL-SERVER-001", "Failed to fetch calendar events");
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error("Unexpected error in GET /api/calendar/events:", err);
    return problem(500, "CAL-SERVER-002", "Internal server error");
  }
}

// POST /api/calendar/events
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const authContext = await getAuthContext();

    if (!authContext?.userId) {
      return problem(401, "CAL-AUTH-003", "Unauthorized");
    }
    if (!authContext.orgId) {
      return problem(
        400,
        "CAL-AUTH-004",
        "User must belong to an organization"
      );
    }

    const json = await parseJson(request);
    const parsed = validateBody(EventCreateSchema, json);

    if (!parsed.ok) {
      return problem(400, "CAL-VAL-002", "Invalid body", undefined, {
        issues: parsed.issues,
      });
    }

    const {
      title,
      description,
      start_time,
      end_time,
      all_day,
      color,
      unit_id,
      metadata,
    } = parsed.data as EventCreate;

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        org_id: authContext.orgId,
        unit_id: unit_id ?? null,
        title,
        description: description ?? null,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        all_day: all_day ?? false,
        color: color ?? null,
        metadata: metadata ?? null,
        created_by: authContext.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating calendar event:", error);
      return problem(500, "CAL-SERVER-003", "Failed to create calendar event");
    }

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/calendar/events:", err);
    return problem(500, "CAL-SERVER-004", "Internal server error");
  }
}
