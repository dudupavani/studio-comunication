import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/messages/auth-context";
import { fetchInboxItems } from "@/lib/messages/inbox";
import InboxClient from "./inbox-client";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }
  if (!auth.orgId) {
    notFound();
  }

  const items = await fetchInboxItems(auth.userId, auth.orgId, {
    unitIds: auth.unitIds,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Comunicados e Conversas</h1>
      </div>

      <InboxClient items={items} />
    </div>
  );
}
