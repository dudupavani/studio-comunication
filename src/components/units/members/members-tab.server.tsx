// src/components/units/members/members-tab.server.tsx
import { listUnitMembersWithEmail } from "@/lib/actions/unit-members";
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
import UserLineItem from "@/components/users/user-line-item"; // ⬅️ novo padrão

export default async function MembersTabServer({
  orgId,
  unitId,
  unitSlug,
}: {
  orgId: string;
  unitId: string;
  unitSlug: string;
}) {
  // Agora usamos a variante que agrega e-mail via Admin API (lado servidor)
  const membersRes = await listUnitMembersWithEmail(orgId, unitId);
  const members = membersRes.ok ? membersRes.data : [];
  const total = members.length;

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Membros da unidade{" "}
          <span className="font-light text-muted-foreground">({total})</span>
        </h2>
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
                <TableHead>Membro</TableHead>
                {/* <TableHead>Função</TableHead> */}
                <TableHead className="w-[80px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const userId = m.user_id as string;
                const userName = m.profiles?.full_name ?? "Sem nome";
                const email = m.email ?? m.profiles?.email ?? null;

                return (
                  <TableRow key={userId}>
                    <TableCell className="py-2">
                      <UserLineItem
                        id={userId}
                        name={userName}
                        email={email}
                        // avatarUrl: se no futuro vier no payload, é só passar aqui
                        size="md"
                        orientation="stacked"
                        withCopy
                      />
                    </TableCell>

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
