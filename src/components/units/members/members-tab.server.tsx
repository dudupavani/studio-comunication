// src/components/units/members/members-tab.server.tsx
import { listUnitMembers } from "@/lib/actions/unit-members";
import AddUnitMemberModal from "./add-unit-member-modal";
import RemoveUnitMemberButton from "./remove-unit-member-button";
import { UserRoundX } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default async function MembersTabServer({
  orgId,
  unitId,
  unitSlug,
}: {
  orgId: string;
  unitId: string;
  unitSlug: string;
}) {
  const membersRes = await listUnitMembers(orgId, unitId);
  const members = membersRes.ok ? membersRes.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Membros da unidade</h2>
        <AddUnitMemberModal orgId={orgId} unitId={unitId} />
      </div>

      <div className="rounded-lg border border-gray-200 p-0">
        {members.length === 0 ? (
          <div className="p-8 mx-auto">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4 w-12 h-12 text-gray-700 border border-muted shadow-lg flex items-center justify-center rounded-lg bg-white">
                <UserRoundX />
              </div>
              <p className="text-muted-foreground">
                Nenhum membro vinculado ainda.
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                {/* <TableHead>Função</TableHead> */}
                <TableHead className="w-[80px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const userId = m.user_id as string;
                const userName = m.profiles?.full_name ?? "Sem nome";

                return (
                  <TableRow key={userId}>
                    <TableCell className="font-medium">{userName}</TableCell>
                    {/* <TableCell>{m.role ?? "-"}</TableCell> */}
                    <TableCell className="text-right">
                      <RemoveUnitMemberButton
                        orgId={orgId}
                        unitId={unitId}
                        userId={userId}
                        userName={userName}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
