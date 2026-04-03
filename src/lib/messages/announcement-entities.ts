export const ANNOUNCEMENT_REACTIONS = ["👍"] as const;

export type AnnouncementComment = {
  id: string;
  authorId: string;
  authorName: string | null;
  authorAvatar?: string | null;
  authorTitle?: string | null;
  content: string;
  createdAt: string;
  isMine: boolean;
};

export type AnnouncementReactionSummary = {
  emoji: string;
  count: number;
  reacted: boolean;
};

export type AnnouncementMediaKind = "image" | "video";

export type AnnouncementMedia = {
  kind: AnnouncementMediaKind;
  url: string;
  thumbnailUrl?: string | null;
};

export type AnnouncementItem = {
  announcementId: string;
  title: string;
  senderName: string | null;
  senderId: string | null;
  senderAvatar?: string | null;
  senderTitle?: string | null;
  createdAt: string;
  publishedAt?: string | null;
  sendAt?: string | null;
  sentAt?: string | null;
  status?: "sent" | "scheduled";
  allowComments: boolean;
  allowReactions: boolean;
  media?: AnnouncementMedia | null;
  contentPreview: string;
  fullContent?: string;
  comments?: AnnouncementComment[];
  reactions?: AnnouncementReactionSummary[];
};
