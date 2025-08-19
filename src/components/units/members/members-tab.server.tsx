// src/components/units/members/members-tab.server.tsx
import { listUnitMembers } from "@/lib/actions/unit-members";
import AddUnitMemberModal from "./add-unit-member-modal";

export default async function MembersTabServer({
  orgId,
  orgSlug,
  unitId,
  unitSlug,
}: {
  orgId: string;
  orgSlug: string;
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

      <div className="rounded-lg border border-dashed p-8">
        {members.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Nenhum membro vinculado ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">
                    {m.profiles?.full_name ?? "Sem nome"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.profiles?.email}
                  </p>
                </div>
                <span className="text-xs rounded-full border px-2 py-1">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
