import { notFound } from "next/navigation";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/helpdesk/auth-context";
import {
  fetchChatById,
  fetchChatMembers,
  isChatAdmin,
  isChatMember,
} from "@/lib/helpdesk/queries";
import type { ChatMemberWithUser } from "../components/types";
import { ConversationLayout } from "../components/ConversationLayout";

export default async function HelpdeskChatPage({
  params,
}: {
  params: { id: string };
}) {
  const chatId = params.id;
  const auth = await getAuthContext();
  const supabase = createServerClientWithCookies();

  const member = await isChatMember(supabase, chatId, auth.userId);
  if (!member) {
    notFound();
  }

  const chat = await fetchChatById(supabase, chatId);
  if (!chat) {
    notFound();
  }

  const members = (await fetchChatMembers(supabase, chatId)) as ChatMemberWithUser[];
  const canManageMembers =
    auth.isPlatformAdmin || (await isChatAdmin(supabase, chatId, auth.userId));

  return (
    <ConversationLayout
      chat={chat}
      chatId={chatId}
      currentUserId={auth.userId}
      initialMembers={members}
      canManageMembers={canManageMembers}
    />
  );
}
