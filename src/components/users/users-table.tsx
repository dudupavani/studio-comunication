// src/components/users/users-table.tsx
"use client";

import { useState } from "react";
import { Profile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Pencil } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getRoleLabel } from "@/lib/role-labels";
import EmailCopy from "@/components/EmailCopy"; // ⬅️ novo import

interface UsersTableProps {
  users: Profile[];
}

export function UsersTable({ users }: UsersTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof Profile | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const router = useRouter();

  const handleSort = (column: keyof Profile) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortColumn) return 0;

    const aValue = a[sortColumn] as unknown;
    const bValue = b[sortColumn] as unknown;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    } else if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === "asc"
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }
    return 0;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead onClick={() => handleSort("full_name")}>
            <div className="flex items-center cursor-pointer">
              Nome Completo
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead onClick={() => handleSort("email")}>
            <div className="flex items-center cursor-pointer">
              Email
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead onClick={() => handleSort("phone")}>
            <div className="flex items-center cursor-pointer">
              Telefone
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead onClick={() => handleSort("global_role")}>
            <div className="flex items-center cursor-pointer">
              Global Role
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead onClick={() => handleSort("created_at")}>
            <div className="flex items-center cursor-pointer">
              Criado Em
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead>Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedUsers.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="flex items-center">
              {user.avatar_url && (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name || "Avatar"}
                  width={32}
                  height={32}
                  className="rounded-full mr-2"
                />
              )}
              {user.full_name}
            </TableCell>

            <TableCell>
              {user.email ? (
                <div className="flex items-center gap-1 max-w-[260px] sm:max-w-[320px]">
                  <span className="truncate" title={user.email}>
                    {user.email}
                  </span>
                  <EmailCopy email={user.email} />
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>

            <TableCell>{user.phone}</TableCell>

            <TableCell>
              <Badge
                variant={
                  user.global_role === "platform_admin"
                    ? "default"
                    : "secondary"
                }>
                {getRoleLabel(user.global_role)}
              </Badge>
            </TableCell>

            <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>

            <TableCell>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Editar usuário ${
                  user.full_name ?? user.email ?? ""
                }`}
                onClick={() => router.push(`/users/${user.id}/edit`)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
