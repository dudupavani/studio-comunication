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
import { Button } from "@/components/ui/button";

export default function OrgsTable({ initialOrgs }: { initialOrgs: Org[] }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-end">
        <CreateOrgDialog />
      </div>

      <Table>
        <TableHeader className="bg-muted/50 text-left">
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialOrgs.map((org) => (
            <TableRow key={org.id}>
              <TableCell>
                <Link
                  href={`/orgs/${org.slug}/settings`}
                  className="underline"
                  prefetch={false}>
                  {org.name}
                </Link>
              </TableCell>
              <TableCell>{org.city ?? "-"}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orgs/${org.slug}/settings`}>Entrar</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {initialOrgs.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                Você ainda não possui organizações.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
