"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event as RBCEvent,
  Views,
  type View,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "../ui/button";
import { CalendarSync, Plus } from "lucide-react";

import { useCalendarEvents } from "@/lib/calendar/useCalendarEvents";
import { toRbcEvent } from "@/lib/calendar/adapter";
import type { RbcEvent, CalendarEventDTO } from "@/lib/calendar/types";
import NewEventDialog from "@/components/calendar/NewEventDialog";
import EventDetailsDialog from "@/components/calendar/EventDetailsDialog";

const locales = { "pt-BR": ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarClientProps {
  orgId: string;
  unitId?: string;
}

export default function CalendarClient({ orgId, unitId }: CalendarClientProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarEventDTO | null>(null); // <- NOVO
  const [prefill, setPrefill] = useState<{
    start?: Date;
    end?: Date;
    allDay?: boolean;
  }>({});

  // range: ±45 dias
  const { fromISO, toISO } = useMemo(() => {
    const from = new Date(date);
    from.setDate(from.getDate() - 45);
    const to = new Date(date);
    to.setDate(to.getDate() + 45);
    return { fromISO: from.toISOString(), toISO: to.toISOString() };
  }, [date]);

  const { data, loading, error, refetch } = useCalendarEvents({
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

  // helpers para lzr opcional
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

  const openNew = () => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(10, 0, 0, 0);
    setPrefill({ start, end, allDay: false });
    setOpen(true);
  };

  const onSelectSlot = (slot: any) => {
    const start = slot.start as Date;
    const end = slot.end as Date;
    const allDay = !!slot.action && slot.action !== "click";
    setPrefill({ start, end, allDay });
    setOpen(true);
  };

  // <- NOVO: clique em evento abre modal com DTO do resource
  const onSelectEvent = (evt: RBCEvent) => {
    const dto = (evt as any)?.resource as CalendarEventDTO | undefined;
    if (dto) setSelected(dto);
  };

  const onCreated = (_ev: CalendarEventDTO) => refetch();

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        Carregando calendário...
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        Erro ao carregar eventos: {error}
      </div>
    );

  return (
    <div className="flex flex-col p-4 sm:p-0">
      {/* toolbar simples */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-gray-500">{`Eventos: ${events.length}`}</div>
        <div className="flex items-center gap-4">
          <Button type="button" onClick={refetch} variant={"outline"}>
            <CalendarSync size={18} />
            Recarregar
          </Button>
          <Button type="button" variant={"default"} onClick={openNew}>
            <Plus />
            Evento
          </Button>
        </div>
      </div>

      <Calendar
        selectable
        localizer={localizer}
        culture="pt-BR"
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={{ month: true, week: true, day: true, agenda: true }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent} // <- NOVO
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
          dateFormat: "d",
          dayFormat: "dd/MM",
          weekdayFormat: "EEE",
          monthHeaderFormat: "MMMM yyyy",
          dayHeaderFormat: "EEEE, dd/MM/yyyy",
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
        style={{ minHeight: 500 }}
      />

      {/* criar */}
      <NewEventDialog
        open={open}
        onClose={() => setOpen(false)}
        orgId={orgId}
        unitId={unitId}
        defaultStart={prefill.start}
        defaultEnd={prefill.end}
        defaultAllDay={prefill.allDay}
        onCreated={onCreated}
      />

      {/* detalhes */}
      <EventDetailsDialog
        open={!!selected}
        event={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
