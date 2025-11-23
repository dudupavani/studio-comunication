export type TeamMemberSummary = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export type TeamSummary = {
  id: string;
  name: string;
  leaderId: string | null;
  leaderName: string | null;
  leaderAvatarUrl: string | null;
  membersCount: number;
  members: TeamMemberSummary[];
  updatedAt?: string | null;
};

export type OrgUserOption = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
};

export type TeamFormValues = {
  name: string;
  leaderId: string;
  members: string[];
};

export type TeamDetails = {
  id: string;
  name: string;
  leader: string;
  members: string[];
};
