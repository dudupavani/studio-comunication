import { CalendarEventDTO, RbcEvent } from './types'

export function toRbcEvent(row: CalendarEventDTO): RbcEvent {
  return {
    id: row.id,
    title: row.title,
    start: new Date(row.start_time),
    end: new Date(row.end_time),
    allDay: row.all_day,
    resource: row
  }
}

export function fromRbcEvent(e: RbcEvent): Partial<CalendarEventDTO> {
  return {
    id: e.id,
    title: e.title,
    start_time: e.start.toISOString(),
    end_time: e.end.toISOString(),
    all_day: e.allDay || false
  }
}