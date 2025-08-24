import { createClient } from '../../../../lib/supabase/server'
import { getAuthContext } from '../../../../lib/auth-context'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const authContext = await getAuthContext(supabase)

    // Check if user is authenticated
    if (!authContext || !authContext.userId) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, start_time, end_time, all_day, color, unit_id, metadata } = body

    // Validate date format if provided
    if (start_time && isNaN(new Date(start_time).getTime())) {
      return NextResponse.json(
        { data: null, error: 'Invalid date format for start_time' },
        { status: 400 }
      )
    }

    if (end_time && isNaN(new Date(end_time).getTime())) {
      return NextResponse.json(
        { data: null, error: 'Invalid date format for end_time' },
        { status: 400 }
      )
    }

    // Update event
    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        title,
        start_time,
        end_time,
        all_day,
        color,
        unit_id,
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating calendar event ${params.id}:`, error)
      return NextResponse.json(
        { data: null, error: 'Failed to update calendar event' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { data: null, error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error(`Unexpected error in PATCH /api/calendar/events/${params.id}:`, error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const authContext = await getAuthContext(supabase)

    // Check if user is authenticated
    if (!authContext || !authContext.userId) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete event
    const { data, error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error(`Error deleting calendar event ${params.id}:`, error)
      return NextResponse.json(
        { data: null, error: 'Failed to delete calendar event' },
        { status: 500 }
      )
    }

    if (data && data.length === 0) {
      return NextResponse.json(
        { data: null, error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: { message: 'Event deleted successfully' }, error: null })
  } catch (error) {
    console.error(`Unexpected error in DELETE /api/calendar/events/${params.id}:`, error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}