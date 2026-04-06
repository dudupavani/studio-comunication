import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  buildReactionSummaryByTargetIds,
  getEmptyReactionSummary,
} from "@/lib/reactions/core";

type TypedClient = SupabaseClient<Database>;

export async function getCommunityPostReactionTarget(args: {
  svc: TypedClient;
  postId: string;
  communityId: string;
  spaceId: string;
  orgId: string;
}) {
  const { data, error } = await args.svc
    .from("community_space_post_reaction_targets")
    .select("target_id")
    .eq("post_id", args.postId)
    .eq("community_id", args.communityId)
    .eq("space_id", args.spaceId)
    .eq("org_id", args.orgId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.target_id ?? null;
}

export async function buildCommunityPostReactionSummaryByPost(args: {
  svc: TypedClient;
  postIds: string[];
  orgId: string;
  userId: string;
}) {
  const postIds = Array.from(new Set(args.postIds.filter(Boolean)));
  const summaryByPost = new Map<string, ReturnType<typeof getEmptyReactionSummary>>();

  postIds.forEach((postId) => {
    summaryByPost.set(postId, getEmptyReactionSummary());
  });

  if (postIds.length === 0) {
    return summaryByPost;
  }

  const { data: targetRows, error: targetsError } = await args.svc
    .from("community_space_post_reaction_targets")
    .select("post_id, target_id")
    .eq("org_id", args.orgId)
    .in("post_id", postIds);

  if (targetsError) {
    throw targetsError;
  }

  const targetIdByPostId = new Map<string, string>();
  (targetRows ?? []).forEach((row) => {
    targetIdByPostId.set(row.post_id, row.target_id);
  });

  const targetIds = Array.from(new Set((targetRows ?? []).map((row) => row.target_id)));
  if (targetIds.length === 0) {
    return summaryByPost;
  }

  const summaryByTarget = await buildReactionSummaryByTargetIds({
    svc: args.svc,
    targetIds,
    orgId: args.orgId,
    userId: args.userId,
  });

  targetIdByPostId.forEach((targetId, postId) => {
    summaryByPost.set(postId, summaryByTarget.get(targetId) ?? getEmptyReactionSummary());
  });

  return summaryByPost;
}
