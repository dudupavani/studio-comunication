"use client";

import Link from "next/link";
import CreateOrgDialog from "./create-org-dialog";
import type { Org } from "@/lib/actions/orgs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OrgsTable({ initialOrgs }: { initialOrgs: Org[] }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Minhas Organizações</h1>
        <CreateOrgDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="w-[220px]">Slug</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialOrgs.map((org) => (
            <TableRow key={org.id}>
              <TableCell>
                <Link href={`/orgs/${org.slug}`} className="underline">
                  {org.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {org.slug}
              </TableCell>
            </TableRow>
          ))}
          {initialOrgs.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground">
                Você ainda não possui organizações.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
