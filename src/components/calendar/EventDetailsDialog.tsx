"use client";

import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Hash, Tag } from "lucide-react";

import type { CalendarEventDTO } from "@/lib/calendar/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";

type Props = {
  open: boolean;
  event: CalendarEventDTO | null;
  onClose: () => void;
};

function renderDateRange(ev: CalendarEventDTO) {
  const s = new Date(ev.start_time);
  const e = new Date(ev.end_time);

  if (ev.all_day) {
    if (isSameDay(s, e)) {
      return `${format(s, "dd/MM/yyyy", { locale: ptBR })} (dia inteiro)`;
    }
    return `${format(s, "dd/MM/yyyy", { locale: ptBR })} — ${format(
      e,
      "dd/MM/yyyy",
      { locale: ptBR }
    )} (dias inteiros)`;
  }

  if (isSameDay(s, e)) {
    return `${format(s, "dd/MM/yyyy", { locale: ptBR })} • ${format(
      s,
      "HH:mm",
      { locale: ptBR }
    )} — ${format(e, "HH:mm", { locale: ptBR })}`;
  }

  return `${format(s, "dd/MM/yyyy HH:mm", { locale: ptBR })} — ${format(
    e,
    "dd/MM/yyyy HH:mm",
    { locale: ptBR }
  )}`;
}

export default function EventDetailsDialog({ open, event, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-sm"
              style={{ backgroundColor: event?.color || "#3b82f6" }}
              aria-hidden
            />
            {event?.title ?? "Evento"}
          </DialogTitle>
        </DialogHeader>

        {event && (
          <div className="space-y-4">
            {/* Datas */}
            <div className="flex items-start items-center gap-2 text-sm">
              <div className="w-8 h-8 flex items-center justify-center rounded-sm bg-gray-200">
                <CalendarIcon size={20} />
              </div>
              <div className="text-lg ml-3">{renderDateRange(event)}</div>
            </div>

            {/* Metadados rápidos */}
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 ">
                <Clock className="h-4 w-4" />
                <span>{event.all_day ? "Dia inteiro" : "Com horário"}</span>
              </div>

              {event.unit_id && (
                <div className="flex items-center gap-2 ">
                  <Hash className="h-4 w-4" />
                  <span>Unidade: {event.unit_id}</span>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div>
              <div className="mb-2 text-base font-semibold">Descrição</div>
              <div className="whitespace-pre-wrap text-base">
                {event.description && event.description.trim().length > 0
                  ? event.description
                  : "Sem descrição."}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
