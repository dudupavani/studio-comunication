// src/lib/messages/types.ts
export type ChatType = "direct" | "group" | "broadcast";

export interface Chat {
  id: string;
  org_id: string;
  name: string | null;
  type: ChatType;
  allow_replies: boolean;
  created_by: string;
  created_at: string;
}

export interface ChatMember {
  id: number;
  chat_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
}

export interface ChatMessageMention {
  id: number;
  type: "user" | "all";
  mentioned_user_id: string | null;
  raw_label: string | null;
  user?: UserMini | null;
}

export interface ChatMessage {
  id: number;
  chat_id: string;
  sender_id: string;
  message: string;
  attachments: any | null;
  created_at: string;
  mentions?: ChatMessageMention[];
}

export interface UserMini {
  id: string;
  full_name: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface ChatSummary extends Chat {
  last_message?: {
    id: number;
    message: string;
    created_at: string;
    sender_id: string;
    sender_name?: string | null;
  } | null;
  creator?: UserMini | null;
  unread_count?: number;
  last_unread_at?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}
