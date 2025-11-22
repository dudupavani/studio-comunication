import type { ChatMember, UserMini } from "@/lib/messages/types";

export type ChatMemberWithUser = ChatMember & {
  user: UserMini | null;
};
