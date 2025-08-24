"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event as RBCEvent,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { useCalendarEvents } from "@/lib/calendar/useCalendarEvents";
import { toRbcEvent } from "@/lib/calendar/adapter";
import type { RbcEvent } from "@/lib/calendar/types";

const locales = { "pt-BR": ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek, // pt-BR -> semana começa na segunda
  getDay,
  locales,
});

interface CalendarClientProps {
  orgId: string;
  unitId?: string;
}

export default function CalendarClient({ orgId, unitId }: CalendarClientProps) {
  const [date, setDate] = useState<Date>(new Date());

  // Range: 3 meses antes e 3 meses depois da data visível
  const { fromISO, toISO } = useMemo(() => {
    const from = new Date(date);
    from.setMonth(from.getMonth() - 3);
    const to = new Date(date);
    to.setMonth(to.getMonth() + 3);
    return { fromISO: from.toISOString(), toISO: to.toISOString() };
  }, [date]);

  const { data, loading, error } = useCalendarEvents({
    from: fromISO,
    to: toISO,
    orgId,
    unitId,
  });

  const events: RBCEvent[] = useMemo<RBCEvent[]>(
    () => (data ?? []).map(toRbcEvent) as RbcEvent[],
    [data]
  );

  const eventPropGetter = useCallback((event: RBCEvent) => {
    const color = (event as any)?.resource?.color as string | null | undefined;
    if (!color) return {};
    return {
      style: {
        backgroundColor: color,
        borderRadius: "6px",
        border: "none",
        opacity: 0.95,
      },
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        Carregando calendário...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        Erro ao carregar eventos: {error}
      </div>
    );
  }

  // helpers de fallback quando lzr é opcional
  const fmt = (d: Date, pattern: string, culture?: string, lzr?: any) =>
    lzr
      ? lzr.format(d, pattern, culture)
      : format(d, pattern, { locale: ptBR });

  const fmtRange = (
    s: Date,
    e: Date,
    pattern: string,
    culture?: string,
    lzr?: any
  ) => `${fmt(s, pattern, culture, lzr)} – ${fmt(e, pattern, culture, lzr)}`;

  return (
    <div className="h-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={["month", "week", "day", "agenda"]}
        step={60}
        date={date} // estado controlado
        onNavigate={setDate}
        eventPropGetter={eventPropGetter}
        messages={{
          allDay: "Dia inteiro",
          previous: "Anterior",
          next: "Próximo",
          today: "Hoje",
          month: "Mês",
          week: "Semana",
          day: "Dia",
          agenda: "Agenda",
          date: "Data",
          time: "Hora",
          event: "Evento",
          noEventsInRange: "Não há eventos neste intervalo.",
          showMore: (total: number) => `+${total} mais`,
        }}
        formats={{
          // strings simples (aceitas pelo RBC)
          dateFormat: "d",
          dayFormat: "dd/MM",
          weekdayFormat: "EEE",
          monthHeaderFormat: "MMMM yyyy",
          dayHeaderFormat: "EEEE, dd/MM/yyyy",

          // funções com lzr opcional (corrige TS: lzr possivelmente indefinido)
          dayRangeHeaderFormat: ({ start, end }, culture, lzr) =>
            fmtRange(start, end, "dd/MM/yyyy", culture, lzr),

          agendaHeaderFormat: ({ start, end }, culture, lzr) =>
            fmtRange(start, end, "dd/MM/yyyy", culture, lzr),

          agendaDateFormat: (d, culture, lzr) =>
            fmt(d, "EEE, dd/MM", culture, lzr),

          timeGutterFormat: (d, culture, lzr) => fmt(d, "HH:mm", culture, lzr),

          eventTimeRangeFormat: ({ start, end }, culture, lzr) =>
            fmtRange(start, end, "HH:mm", culture, lzr),

          agendaTimeRangeFormat: ({ start, end }, culture, lzr) =>
            fmtRange(start, end, "HH:mm", culture, lzr),
        }}
        style={{ height: 680 }}
      />
    </div>
  );
}
