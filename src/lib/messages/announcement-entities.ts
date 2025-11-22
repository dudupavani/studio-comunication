export const ANNOUNCEMENT_REACTIONS = ["👍", "❤️", "🤩", "👏", "👏"] as const;

export type AnnouncementComment = {
  id: string;
  authorId: string;
  authorName: string | null;
  content: string;
  createdAt: string;
  isMine: boolean;
};

export type AnnouncementReactionSummary = {
  emoji: string;
  count: number;
  reacted: boolean;
};

export type AnnouncementItem = {
  announcementId: string;
  title: string;
  senderName: string | null;
  senderId: string | null;
  senderAvatar?: string | null;
  createdAt: string;
  allowComments: boolean;
  allowReactions: boolean;
  contentPreview: string;
  fullContent?: string;
  comments?: AnnouncementComment[];
  reactions?: AnnouncementReactionSummary[];
};
