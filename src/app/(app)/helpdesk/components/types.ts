import type { ChatMember, UserMini } from "@/lib/helpdesk/types";

export type ChatMemberWithUser = ChatMember & {
  user: UserMini | null;
};
