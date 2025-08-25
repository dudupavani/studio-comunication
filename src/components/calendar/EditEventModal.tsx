// src/components/calendar/EditEventModal.tsx
"use client";

import * as React from "react";
import type { CalendarEventDTO } from "@/lib/calendar/types";

// shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ícones e formato
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** ===== Helpers compatíveis com o NewEventDialog ===== */
const MINUTE_STEP = 15;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toHHmm(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function combineDateAndTime(date: Date, hh: string, mm: string) {
  const H = parseInt(hh, 10) || 0;
  const M = parseInt(mm, 10) || 0;
  const x = new Date(date);
  x.setHours(H, M, 0, 0);
  return x;
}
function splitHHmm(v: string): [string, string] {
  const [h = "00", m = "00"] = v.split(":");
  return [pad(Number(h) || 0), pad(Number(m) || 0)];
}

function TimeSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string; // "HH:mm"
  onChange: (v: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [h, m] = splitHHmm(value);
  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: 60 / MINUTE_STEP }, (_, i) =>
    pad(i * MINUTE_STEP)
  );

  const setH = (hh: string) => onChange(`${hh}:${m}`);
  const setM = (mm: string) => onChange(`${h}:${mm}`);

  return (
    <div className="flex items-center gap-2" id={id}>
      <Select value={h} onValueChange={setH} disabled={disabled}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent align="start" className="max-h-72">
          {hours.map((hh) => (
            <SelectItem key={hh} value={hh}>
              {hh}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">:</span>
      <Select value={m} onValueChange={setM} disabled={disabled}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="mm" />
        </SelectTrigger>
        <SelectContent align="start" className="max-h-72">
          {minutes.map((mm) => (
            <SelectItem key={mm} value={mm}>
              {mm}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** ===== Modal de Edição ===== */
type Props = {
  open: boolean;
  onClose: () => void;
  event: CalendarEventDTO | null;
  onUpdated: (updated: Partial<CalendarEventDTO>) => void;
};

export function EditEventModal({ open, onClose, event, onUpdated }: Props) {
  // campos básicos
  const [title, setTitle] = React.useState("");
  const [allDay, setAllDay] = React.useState(false);
  const [color, setColor] = React.useState<string>("#3b82f6");
  const [description, setDescription] = React.useState<string>("");

  // datas + horas
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [startTime, setStartTime] = React.useState<string>("09:00");
  const [endTime, setEndTime] = React.useState<string>("10:00");

  // estados de submissão
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Preencher campos quando abrir com um evento
  React.useEffect(() => {
    if (!open || !event) return;

    setError(null);
    setTitle(event.title ?? "");
    setDescription(event.description ?? "");
    setAllDay(!!event.all_day);
    setColor(event.color ?? "#3b82f6");

    const s = new Date(event.start_time);
    const e = new Date(event.end_time);
    setStartDate(s);
    setEndDate(e);
    setStartTime(toHHmm(s));
    setEndTime(toHHmm(e));
  }, [open, event]);

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!event) return;

    try {
      setSubmitting(true);
      setError(null);

      if (!title.trim()) throw new Error("Título é obrigatório.");
      if (!startDate || !endDate)
        throw new Error("Selecione as datas de início e fim.");

      const [sh, sm] = splitHHmm(startTime);
      const [eh, em] = splitHHmm(endTime);

      let start = allDay
        ? startOfDay(startDate)
        : combineDateAndTime(startDate, sh, sm);
      let end = allDay
        ? endOfDay(endDate)
        : combineDateAndTime(endDate, eh, em);

      if (allDay) {
        if (end < start)
          throw new Error("Data final não pode ser antes da inicial.");
      } else {
        if (end <= start) throw new Error("Fim precisa ser depois do início.");
      }

      const payload: Partial<CalendarEventDTO> & {
        start_time?: string;
        end_time?: string;
        all_day?: boolean;
        color?: string | null;
        description?: string | null;
        title?: string;
      } = {
        title: title.trim(),
        description: description || null,
        all_day: allDay,
        color: color || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      };

      const res = await fetch(`/api/calendar/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error || `Falha ao atualizar (HTTP ${res.status})`
        );
      }

      onUpdated(json?.data as Partial<CalendarEventDTO>);
      onClose();
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
        </DialogHeader>

        {!event ? (
          <div className="text-sm text-muted-foreground">
            Nenhum evento selecionado.
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* título */}
            <div>
              <Label htmlFor="title" className="mb-1 block text-sm font-medium">
                Título *
              </Label>
              <Input
                id="title"
                placeholder="Ex.: Reunião com a equipe"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* dia inteiro */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="allDay"
                checked={allDay}
                onCheckedChange={(v) => setAllDay(!!v)}
              />
              <Label htmlFor="allDay" className="text-sm">
                Dia inteiro
              </Label>
            </div>

            {/* datas + horas */}
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              {/* início */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-muted px-3 justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "dd/MM/yyyy", { locale: ptBR })
                        : "Escolha a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <DatePicker
                      mode="single"
                      selected={startDate ?? undefined}
                      onSelect={(d) => d && setStartDate(d)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>

                <TimeSelect
                  id="start-time"
                  value={startTime}
                  onChange={setStartTime}
                  disabled={allDay}
                />
              </div>

              {/* fim */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fim *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-muted px-3 justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate
                        ? format(endDate, "dd/MM/yyyy", { locale: ptBR })
                        : "Escolha a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <DatePicker
                      mode="single"
                      selected={endDate ?? undefined}
                      onSelect={(d) => d && setEndDate(d)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>

                <TimeSelect
                  id="end-time"
                  value={endTime}
                  onChange={setEndTime}
                  disabled={allDay}
                />
              </div>
            </div>

            {/* cor + unidade */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label
                  htmlFor="color"
                  className="mb-1 block text-sm font-medium">
                  Cor
                </Label>
                <Input
                  id="color"
                  type="color"
                  className="h-10"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>

              {event.unit_id && (
                <div>
                  <Label
                    htmlFor="unit"
                    className="mb-1 block text-sm font-medium">
                    Unidade
                  </Label>
                  <Input
                    id="unit"
                    value={event.unit_id}
                    readOnly
                    className="bg-gray-50"
                    title="Pré-selecionada pelo contexto"
                  />
                </div>
              )}
            </div>

            {/* descrição */}
            <div>
              <Label
                htmlFor="description"
                className="mb-1 block text-sm font-medium">
                Descrição
              </Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Opcional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* ações */}
            <DialogFooter className="gap-2">
              <Button
                type="submit"
                variant="default"
                className="disabled:opacity-60"
                disabled={submitting || !title.trim() || !startDate || !endDate}
                onClick={handleSave}>
                {submitting ? "Salvando…" : "Salvar"}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={submitting}>
                  Cancelar
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
