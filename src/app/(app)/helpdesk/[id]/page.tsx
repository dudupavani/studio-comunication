import { notFound } from "next/navigation";
import { createServerClientReadOnly } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/helpdesk/auth-context";
import {
  fetchChatById,
  fetchChatMembers,
  isChatAdmin,
  isChatMember,
  type TypedSupabaseClient,
} from "@/lib/helpdesk/queries";
import type { ChatMemberWithUser } from "../components/types";
import { ChatFullscreenModal } from "../components/ChatFullscreenModal";

export default async function HelpdeskChatPage({
  params,
}: {
  params: { id: string };
}) {
  const chatId = params.id;
  const supabase = createServerClientReadOnly();
  const auth = await getAuthContext(supabase);

  const member = await isChatMember(supabase, chatId, auth.userId);
  if (!member) {
    notFound();
  }

  const chat = await fetchChatById(supabase, chatId);
  if (!chat) {
    notFound();
  }

  // Usa service client após validar membership para contornar RLS e retornar todos os participantes
  const adminClient = createServiceClient() as unknown as TypedSupabaseClient;
  const members = (await fetchChatMembers(adminClient, chatId)) as ChatMemberWithUser[];
  const canManageMembers =
    auth.isPlatformAdmin || (await isChatAdmin(supabase, chatId, auth.userId));

  return (
    <ChatFullscreenModal
      chat={chat}
      chatId={chatId}
      currentUserId={auth.userId}
      initialMembers={members}
      canManageMembers={canManageMembers}
    />
  );
}
