"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarEventDTO } from "@/lib/calendar/types";

// shadcn/ui
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Calendar as DatePicker } from "../ui/calendar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";

// ícones e formato
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  unitId?: string;
  defaultStart?: Date;
  defaultEnd?: Date;
  defaultAllDay?: boolean;
  onCreated?: (ev: CalendarEventDTO) => void;
};

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

export default function NewEventDialog({
  open,
  onClose,
  orgId,
  unitId,
  defaultStart,
  defaultEnd,
  defaultAllDay,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(!!defaultAllDay);
  const [color, setColor] = useState<string>("#3b82f6");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // datas + horas
  const initialTimes = useMemo(() => {
    const now = new Date();
    const start =
      defaultStart ??
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    const end =
      defaultEnd ??
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
    return { start, end };
  }, [defaultStart, defaultEnd]);

  const [startDate, setStartDate] = useState<Date>(initialTimes.start);
  const [endDate, setEndDate] = useState<Date>(initialTimes.end);
  const [startTime, setStartTime] = useState<string>(
    toHHmm(initialTimes.start)
  );
  const [endTime, setEndTime] = useState<string>(toHHmm(initialTimes.end));

  useEffect(() => {
    if (open) {
      setTitle("");
      setAllDay(!!defaultAllDay);
      setColor("#3b82f6");
      setDescription("");
      setError(null);

      const s = defaultAllDay
        ? startOfDay(initialTimes.start)
        : initialTimes.start;
      const e = defaultAllDay ? endOfDay(initialTimes.end) : initialTimes.end;

      setStartDate(s);
      setEndDate(e);
      setStartTime(toHHmm(s));
      setEndTime(toHHmm(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
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

      const payload = {
        title: title.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        all_day: allDay,
        color: color || null,
        unit_id: unitId ?? null,
        description: description || null,
        metadata: null,
      };

      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json?.error || `Falha ao criar evento (HTTP ${res.status})`
        );

      onCreated?.(json?.data as CalendarEventDTO);
      onClose();
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Criar evento</h3>

        {error && (
          <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
                    selected={startDate}
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
                    selected={endDate}
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
              <Label htmlFor="color" className="mb-1 block text-sm font-medium">
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
            {unitId && (
              <div>
                <Label
                  htmlFor="unit"
                  className="mb-1 block text-sm font-medium">
                  Unidade
                </Label>
                <Input
                  id="unit"
                  value={unitId}
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
          <div className="mt-2 flex items-center justify-start gap-2">
            <Button
              type="submit"
              variant="default"
              className="disabled:opacity-60"
              disabled={submitting}>
              {submitting ? "Criando…" : "Criar"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="hover:bg-gray-50"
              disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
