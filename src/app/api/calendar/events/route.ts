import { createClient } from "../../../../lib/supabase/server";
import { getAuthContext } from "../../../../lib/auth-context";
import { NextResponse } from "next/server";

// Helper function to validate date range
function isValidDateRange(from: string, to: string): boolean {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Check if dates are valid
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return false;
  }

  // Check if range is within 90 days
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= 90;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const orgId = searchParams.get("orgId");
    const unitId = searchParams.get("unitId");

    // Validate required parameters
    if (!from || !to) {
      return NextResponse.json(
        { data: null, error: "Missing required parameters: from, to" },
        { status: 400 }
      );
    }

    // Validate date range
    if (!isValidDateRange(from, to)) {
      return NextResponse.json(
        { data: null, error: "Invalid date range or range exceeds 90 days" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const authContext = await getAuthContext(supabase);

    // Check if user is authenticated
    if (!authContext || !authContext.userId) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate orgId matches user's org
    if (orgId && orgId !== authContext.orgId) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from("calendar_events")
      .select("*")
      .gte("start_time", from)
      .lte("end_time", to)
      .order("start_time", { ascending: true });

    // Filter by orgId
    if (orgId) {
      query = query.eq("org_id", orgId);
    }

    // Filter by unitId if provided
    if (unitId) {
      query = query.eq("unit_id", unitId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching calendar events:", error);
      return NextResponse.json(
        { data: null, error: "Failed to fetch calendar events" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("Unexpected error in GET /api/calendar/events:", error);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const authContext = await getAuthContext(supabase);

    // Check if user is authenticated
    if (!authContext || !authContext.userId) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has org
    if (!authContext.orgId) {
      return NextResponse.json(
        { data: null, error: "User must belong to an organization" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, start_time, end_time, all_day, color, unit_id, metadata } =
      body;

    // Validate required fields
    if (!title || !start_time || !end_time) {
      return NextResponse.json(
        {
          data: null,
          error: "Missing required fields: title, start_time, end_time",
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (
      isNaN(new Date(start_time).getTime()) ||
      isNaN(new Date(end_time).getTime())
    ) {
      return NextResponse.json(
        { data: null, error: "Invalid date format for start_time or end_time" },
        { status: 400 }
      );
    }

    // Create event
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        org_id: authContext.orgId,
        unit_id,
        title,
        start_time,
        end_time,
        all_day: all_day || false,
        color: color || null,
        metadata: metadata || null,
        created_by: authContext.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating calendar event:", error);
      return NextResponse.json(
        { data: null, error: "Failed to create calendar event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/calendar/events:", error);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
