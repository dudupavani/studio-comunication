// src/app/api/calendar/events/[id]/route.ts
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const authContext = await getAuthContext(); // ✅ não passa argumento

    // Check if user is authenticated
    if (!authContext || !authContext.userId) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      start_time,
      end_time,
      all_day,
      color,
      unit_id,
      metadata,
    } = body ?? {};

    // Validate date format if provided
    if (start_time && isNaN(new Date(start_time).getTime())) {
      return NextResponse.json(
        { data: null, error: "Invalid date format for start_time" },
        { status: 400 }
      );
    }

    if (end_time && isNaN(new Date(end_time).getTime())) {
      return NextResponse.json(
        { data: null, error: "Invalid date format for end_time" },
        { status: 400 }
      );
    }

    // Build partial update object (evita sobrescrever com undefined)
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof title !== "undefined") updatePayload.title = title;
    if (typeof description !== "undefined")
      updatePayload.description = description ?? null;
    if (typeof start_time !== "undefined")
      updatePayload.start_time = start_time;
    if (typeof end_time !== "undefined") updatePayload.end_time = end_time;
    if (typeof all_day !== "undefined") updatePayload.all_day = !!all_day;
    if (typeof color !== "undefined") updatePayload.color = color ?? null;
    if (typeof unit_id !== "undefined") updatePayload.unit_id = unit_id ?? null;
    if (typeof metadata !== "undefined")
      updatePayload.metadata = metadata ?? null;

    // Update event
    const { data, error } = await supabase
      .from("calendar_events")
      .update(updatePayload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating calendar event ${params.id}:`, error);
      return NextResponse.json(
        { data: null, error: "Failed to update calendar event" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { data: null, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error(
      `Unexpected error in PATCH /api/calendar/events/${params.id}:`,
      error
    );
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const authContext = await getAuthContext(); // ✅ não passa argumento

    // Check if user is authenticated
    if (!authContext || !authContext.userId) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Delete event e retorne 404 se não existir
    const { data, error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", params.id)
      .select("id") // garante retorno tipado
      .maybeSingle(); // ✅ evita .length em tipo indefinido

    if (error) {
      console.error(`Error deleting calendar event ${params.id}:`, error);
      return NextResponse.json(
        { data: null, error: "Failed to delete calendar event" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { data: null, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { message: "Event deleted successfully" },
      error: null,
    });
  } catch (error) {
    console.error(
      `Unexpected error in DELETE /api/calendar/events/${params.id}:`,
      error
    );
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
