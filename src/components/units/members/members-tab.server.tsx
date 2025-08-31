// src/components/units/members/members-tab.server.tsx
import { listUnitMembers } from "@/lib/actions/unit-members";
import AddUnitMemberModal from "./add-unit-member-modal";
import { UserRoundX } from "lucide-react";

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

  // 🔎 DEBUG (apenas em dev)
  const showDebug = process.env.NODE_ENV !== "production";
  const debugInfo = {
    ok: membersRes.ok,
    error: membersRes.ok ? null : membersRes.error,
    length: Array.isArray(members) ? members.length : null,
    sample: Array.isArray(members) && members.length > 0 ? members[0] : null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Membros da unidade</h2>
        <AddUnitMemberModal orgId={orgId} unitId={unitId} />
      </div>

      {showDebug && (
        <pre className="text-xs p-3 rounded border bg-muted/40 overflow-x-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}

      <div className="rounded-lg border border-dashed p-8">
        {members.length === 0 ? (
          <div className="mx-auto">
            <div className="flex flex-col items-center jutify-center">
              <div className="mb-4 w-12 h-12 text-gray-700 border border-muted shadow-lg flex items-center justify-center rounded-lg bg-white">
                <UserRoundX />
              </div>
              <p className="text-muted-foreground">
                Nenhum membro vinculado ainda.
              </p>
            </div>
          </div>
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
                  {/* Sem e-mail e sem badge de role no schema atual */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
