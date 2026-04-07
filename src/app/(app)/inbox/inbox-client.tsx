"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MessageCircle, Megaphone } from "lucide-react";
import type { InboxItem } from "@/lib/messages/inbox";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

function getInitials(value?: string | null) {
  if (!value) return "?";
  const trimmed = value.trim();
  if (!trimmed.length) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

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
        <CardContent className="py-12 px-6 text-center text-sm text-muted-foreground space-y-2">
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
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inbox-filters w-full">
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-3">
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
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 px-6 text-center text-sm text-muted-foreground">
            Nenhum resultado com os filtros aplicados.
          </CardContent>
        </Card>
      ) : (
        <div>
          {filtered.map((item) => {
            switch (item.kind) {
              case "conversation":
                return (
                  <Link
                    key={`chat-${item.chatId}`}
                    href={`/chats/${item.chatId}`}
                    className="block">
                    <Card className="hover:bg-muted transition-colors rounded-none">
                      <CardContent className="flex items-start gap-4 py-4 pr-6 pl-4">
                        <div className="bg-emerald-100 text-emerald-700 rounded-lg p-2 mt-1">
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h6 className="font-semibold leading-tight">
                              {item.title}
                            </h6>
                          </div>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={item.senderAvatar ?? undefined}
                                  alt={item.senderName ?? "Remetente"}
                                />
                                <AvatarFallback>
                                  {getInitials(
                                    item.senderName || "Remetente desconhecido"
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {item.senderName || "Remetente desconhecido"}
                              </span>
                            </div>
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
                    <Card className="hover:bg-muted transition-colors rounded-none">
                      <CardContent className="flex items-start gap-4 py-4 pr-6 pl-4">
                        <div className="bg-indigo-100 text-indigo-700 rounded-lg p-2 mt-1">
                          <Megaphone className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={item.senderAvatar ?? undefined}
                                  alt={item.senderName ?? "Remetente"}
                                />
                                <AvatarFallback>
                                  {getInitials(
                                    item.senderName || "Remetente desconhecido"
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {item.senderName || "Remetente desconhecido"}
                              </span>
                            </div>
                            <span>
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <h6 className="font-semibold leading-tight">
                              {item.title}
                            </h6>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.contentPreview || "Sem prévia disponível"}
                          </p>
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
                    <Card className="hover:bg-muted transition-colors rounded-none">
                      <CardContent className="flex items-start gap-4 py-4 pr-6 pl-4">
                        <div className="bg-purple-100 text-purple-700 rounded-lg p-2 mt-1">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-4 w-full">
                          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                            <div className="flex flex-col justify-between gap-2">
                              <h5 className="font-semibold leading-tight">
                                {item.title}
                              </h5>
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage
                                    src={item.senderAvatar ?? undefined}
                                    alt={item.senderName ?? "Organizador"}
                                  />
                                  <AvatarFallback>
                                    {getInitials(
                                      item.senderName || "Organizador desconhecido"
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <span>
                                  {item.senderName || "Organizador desconhecido"}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatEventRange(item)}
                            </div>
                          </div>
                          <div>
                            {item.description ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              case "announcement":
              default: {
                const announcementItem = item as Extract<
                  InboxItem,
                  { kind: "announcement" }
                >;
                const fallbackName =
                  announcementItem.senderName || "Remetente desconhecido";
                const fallbackAvatar = announcementItem.senderAvatar ?? null;
                return (
                  <Card key={`announcement-${item.announcementId}`}>
                    <CardContent className="flex items-start gap-4 py-4 pr-6 pl-4">
                      <div className="mt-1 rounded-full bg-primary/10 text-primary p-2">
                        <Megaphone className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h6 className="font-semibold leading-tight">
                            {item.title}
                          </h6>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={fallbackAvatar ?? undefined}
                                alt={fallbackName}
                              />
                              <AvatarFallback>
                                {getInitials(fallbackName)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{fallbackName}</span>
                          </div>
                          <span>
                            {new Date(announcementItem.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            }
          })}
        </div>
      )}
    </div>
  );
}
