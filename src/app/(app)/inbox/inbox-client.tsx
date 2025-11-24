"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MessageCircle, Megaphone } from "lucide-react";
import type { InboxItem } from "@/lib/messages/inbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DATE_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "15", label: "Últimos 15 dias" },
  { value: "30", label: "Últimos 30 dias" },
];

type CalendarInboxItem = Extract<InboxItem, { kind: "calendar_event" }>;

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" });

function formatEventRange(event: CalendarInboxItem) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const sameDay = start.toDateString() === end.toDateString();

  if (event.allDay && sameDay) {
    return `${DATE_FORMATTER.format(start)} • dia inteiro`;
  }

  if (event.allDay && !sameDay) {
    return `${DATE_FORMATTER.format(start)} – ${DATE_FORMATTER.format(
      end
    )} • dia inteiro`;
  }

  if (sameDay) {
    return `${DATE_FORMATTER.format(start)} • ${TIME_FORMATTER.format(
      start
    )} – ${TIME_FORMATTER.format(end)}`;
  }

  return `${DATE_TIME_FORMATTER.format(start)} – ${DATE_TIME_FORMATTER.format(
    end
  )}`;
}

type Props = {
  items: InboxItem[];
};

export default function InboxClient({ items }: Props) {
  const [dateRange, setDateRange] = useState<string>(DATE_OPTIONS[0].value);
  const [senderFilter, setSenderFilter] = useState<string>("all");

  const senderOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      const id = item.senderId ?? "unknown";
      const label =
        item.senderName ||
        (item as any).senderEmail ||
        (item.senderId ? `ID: ${item.senderId}` : "Remetente desconhecido");
      map.set(id, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [items]);

  const filtered = useMemo(() => {
    const days = parseInt(dateRange, 10);
    const now = Date.now();
    const minDate = now - days * 24 * 60 * 60 * 1000;

    return items
      .filter((item) => {
        const created = new Date(item.createdAt).getTime();
        return created >= minDate;
      })
      .filter((item) => {
        if (senderFilter === "all") return true;
        const id = item.senderId ?? "unknown";
        return id === senderFilter;
      });
  }, [dateRange, items, senderFilter]);

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-2">
          <div>Nenhuma mensagem recebida ainda.</div>
          <div className="text-xs">
            Assim que alguém te enviar uma mensagem ou comunicado, ele aparece
            aqui.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {DATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={senderFilter} onValueChange={setSenderFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Remetente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os remetentes</SelectItem>
              {senderOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum resultado com os filtros aplicados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            switch (item.kind) {
              case "conversation":
                return (
                  <Link
                    key={`chat-${item.chatId}`}
                    href={`/chats/${item.chatId}`}
                    className="block">
                    <Card className="hover:border-primary transition-colors">
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold leading-tight">
                              {item.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1">
                              <MessageCircle size={14} />
                              Conversa
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-3">
                            <span>
                              {item.senderName || "Remetente desconhecido"}
                            </span>
                            <span>
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              case "announcement":
                return (
                  <Link
                    key={`announcement-${item.announcementId}`}
                    href="/comunicados"
                    className="block">
                    <Card className="hover:border-primary transition-colors">
                      <CardContent className="flex items-start gap-4 py-4">
                        <div className="mt-1 rounded-full bg-primary/10 text-primary p-2">
                          <Megaphone className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold leading-tight">
                              {item.title}
                            </h4>
                            <Badge variant="outline">Comunicado</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.contentPreview || "Sem prévia disponível"}
                          </p>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {item.senderName || "Remetente desconhecido"}
                            </span>
                            <span>
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              case "calendar_event":
                return (
                  <Link
                    key={`event-${item.eventId}`}
                    href="/calendar"
                    className="block">
                    <Card className="hover:border-primary transition-colors">
                      <CardContent className="flex items-start gap-4 py-4">
                        <div className="mt-1 rounded-full bg-primary/10 text-primary p-2">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold leading-tight">
                              {item.title}
                            </h3>
                            <Badge variant="outline">Evento</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span>{formatEventRange(item)}</span>
                            <span>
                              {item.senderName || "Organizador desconhecido"}
                            </span>
                          </div>
                          {item.description ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              case "announcement":
              default:
                return (
                  <Card key={`announcement-${item.announcementId}`}>
                    <CardContent className="flex items-start gap-4 py-4">
                      <div className="mt-1 rounded-full bg-primary/10 text-primary p-2">
                        <Megaphone className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold leading-tight">
                            {item.title}
                          </h3>
                          <Badge variant="outline">Comunicado</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.senderName || "Remetente desconhecido"} •{" "}
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
            }
          })}
        </div>
      )}
    </div>
  );
}
