import { getAuthContext } from "@/lib/messages/auth-context";
import { notFound } from "next/navigation";
import { MessagesInbox } from "./components/MessagesInbox";

export default async function ChatsPage() {
  const auth = await getAuthContext();
  if (!auth) {
    return notFound();
  }
  const canCreateConversation =
    auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;

  return (
    <div className="h-full p-2 sm:p-6">
      <MessagesInbox canCreateConversation={canCreateConversation} />
    </div>
  );
}
