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
      <InboxClient items={items} />
    </div>
  );
}
