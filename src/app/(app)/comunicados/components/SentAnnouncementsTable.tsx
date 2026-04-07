"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  EllipsisVertical,
  Pen,
  Trash2,
} from "lucide-react";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnnouncementDeleteButton } from "./AnnouncementDeleteButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortKey = "title" | "createdAt";

type Props = {
  items: AnnouncementItem[];
};

export function SentAnnouncementsTable({ items }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortKey === "title") {
        const result = a.title.localeCompare(b.title, "pt-BR", {
          sensitivity: "base",
        });
        return sortDir === "asc" ? result : -result;
      }
      const dateFor = (item: AnnouncementItem) => {
        const base =
          item.status === "scheduled"
            ? item.sendAt ?? item.createdAt
            : item.sentAt ?? item.createdAt;
        const ts = base ? new Date(base).getTime() : NaN;
        return Number.isNaN(ts) ? new Date(item.createdAt).getTime() : ts;
      };
      const aDate = dateFor(a);
      const bDate = dateFor(b);
      return sortDir === "asc" ? aDate - bDate : bDate - aDate;
    });
  }, [items, sortDir, sortKey]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  return (
    <div className="w-full">
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-1"
                  onClick={() => handleSort("title")}>
                  Título
                  {renderSortIcon("title")}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-1"
                  onClick={() => handleSort("createdAt")}>
                  Envio
                  {renderSortIcon("createdAt")}
                </button>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.announcementId}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  {item.status === "scheduled" ? (
                    <Badge variant={"violet"}>
                      <CalendarClock />
                      Agendado
                    </Badge>
                  ) : (
                    <Badge variant={"outline"}>Enviado</Badge>
                  )}
                </TableCell>
                <TableCell className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const base =
                        item.status === "scheduled"
                          ? item.sendAt ?? item.createdAt
                          : item.sentAt ?? item.createdAt;
                      const ts = base ? new Date(base) : null;
                      return ts && !Number.isNaN(ts.getTime())
                        ? ts.toLocaleString()
                        : new Date(item.createdAt).toLocaleString();
                    })()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Ações">
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/comunicados/${item.announcementId}/editar`}
                          className="flex items-center gap-2">
                          <Pen className="h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setDeleteTarget(item.announcementId)}
                        className="flex items-center gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-2 sm:hidden">
        {sortedItems.map((item) => {
          const dateLabel = (() => {
            const base =
              item.status === "scheduled"
                ? item.sendAt ?? item.createdAt
                : item.sentAt ?? item.createdAt;
            const ts = base ? new Date(base) : null;
            return ts && !Number.isNaN(ts.getTime())
              ? ts.toLocaleString()
              : new Date(item.createdAt).toLocaleString();
          })();

          return (
            <div
              key={item.announcementId}
              className="rounded-lg border border-border p-4 space-y-2 bg-card shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold line-clamp-2">
                  {item.title}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Ações"
                      className="h-8 w-8">
                      <EllipsisVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/comunicados/${item.announcementId}/editar`}
                        className="flex items-center gap-2">
                        <Pen className="h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setDeleteTarget(item.announcementId)}
                      className="flex items-center gap-2 text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="shrink-0">
                  {item.status === "scheduled" ? (
                    <Badge variant="violet" className="whitespace-nowrap">
                      <CalendarClock />
                      Agendado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="whitespace-nowrap">
                      Enviado
                    </Badge>
                  )}
                </div>
                <div className="flex-1 text-right">{dateLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
      {deleteTarget ? (
        <AnnouncementDeleteButton
          announcementId={deleteTarget}
          variant="destructive"
          trigger={null}
          open={true}
          onOpenChange={(next) =>
            setDeleteTarget(next ? deleteTarget : null)
          }
        />
      ) : null}
    </div>
  );
}
