"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";

type SortKey = "title" | "createdAt";

type Props = {
  items: AnnouncementItem[];
};

export function SentAnnouncementsTable({ items }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
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
          <TableHead>
            <button
              type="button"
              className="flex items-center gap-1"
              onClick={() => handleSort("createdAt")}>
              Criado em
              {renderSortIcon("createdAt")}
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.map((item) => (
          <TableRow key={item.announcementId}>
            <TableCell className="font-medium">{item.title}</TableCell>
            <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
