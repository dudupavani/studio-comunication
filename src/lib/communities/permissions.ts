import type { AuthContext } from "@/lib/auth-context";
import type { Enums, Tables } from "@/lib/supabase/types";

export type CommunityRow = Tables<"communities">;
export type CommunitySegmentRow = Tables<"community_segments">;
export type CommunitySpaceRow = Tables<"community_spaces">;

export type CommunityVisibility = Enums<"community_visibility">;
export type CommunitySegmentType = Enums<"community_segment_type">;
export type CommunitySpaceType = Enums<"community_space_type">;

export function canManageCommunities(auth: AuthContext | null) {
  if (!auth) return false;
  if (auth.platformRole === "platform_admin") return true;
  return auth.orgRole === "org_admin" || auth.orgRole === "org_master";
}

export function canPostInCommunity(
  auth: AuthContext | null,
  community: Pick<CommunityRow, "allow_unit_master_post" | "allow_unit_user_post">
) {
  if (!auth) return false;

  if (auth.platformRole === "platform_admin") return true;
  if (auth.orgRole === "org_admin" || auth.orgRole === "org_master") {
    return true;
  }

  if (auth.orgRole === "unit_master") {
    return community.allow_unit_master_post;
  }

  if (auth.orgRole === "unit_user") {
    return community.allow_unit_user_post;
  }

  return false;
}

export function hasSegmentMatch(
  segmentType: CommunitySegmentType | null,
  targetIds: string[],
  memberships: {
    groupIds: Set<string>;
    teamIds: Set<string>;
  }
) {
  if (!segmentType) return false;

  if (segmentType === "group") {
    return targetIds.some((targetId) => memberships.groupIds.has(targetId));
  }

  return targetIds.some((targetId) => memberships.teamIds.has(targetId));
}

export function canViewCommunityRecord(args: {
  auth: AuthContext;
  community: Pick<CommunityRow, "visibility" | "segment_type">;
  segmentTargetIds: string[];
  memberships: {
    groupIds: Set<string>;
    teamIds: Set<string>;
  };
}) {
  const { auth, community, segmentTargetIds, memberships } = args;

  if (canManageCommunities(auth)) return true;
  if (community.visibility === "global") return true;

  return hasSegmentMatch(community.segment_type, segmentTargetIds, memberships);
}
