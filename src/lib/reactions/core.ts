import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const DEFAULT_REACTION_EMOJIS = ["👍"] as const;

export type SupportedReactionEmoji = (typeof DEFAULT_REACTION_EMOJIS)[number];

export type ReactionActor = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type ReactionSummary = {
  emoji: string;
  count: number;
  reacted: boolean;
  previewUsers: ReactionActor[];
};

const REACTION_PREVIEW_LIMIT = 3;

function createEmptyReactionSummary(): ReactionSummary[] {
  return DEFAULT_REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: 0,
    reacted: false,
    previewUsers: [],
  }));
}

export function getEmptyReactionSummary() {
  return createEmptyReactionSummary();
}

export async function buildReactionSummaryByTargetIds(args: {
  svc: SupabaseClient<Database>;
  targetIds: string[];
  orgId: string;
  userId: string;
}) {
  const uniqueTargetIds = Array.from(new Set(args.targetIds.filter(Boolean)));
  const summaryByTarget = new Map<string, ReactionSummary[]>();

  uniqueTargetIds.forEach((targetId) => {
    summaryByTarget.set(targetId, createEmptyReactionSummary());
  });

  if (uniqueTargetIds.length === 0) {
    return summaryByTarget;
  }

  const { data, error } = await args.svc
    .from("reactions")
    .select("target_id, user_id, emoji, created_at")
    .eq("org_id", args.orgId)
    .in("target_id", uniqueTargetIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const uniqueUserIds = Array.from(
    new Set((data ?? []).map((row) => row.user_id).filter(Boolean)),
  );
  const profilesByUserId = new Map<
    string,
    Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "avatar_url">
  >();

  if (uniqueUserIds.length > 0) {
    const { data: profileRows, error: profilesError } = await args.svc
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", uniqueUserIds);

    if (profilesError) {
      throw profilesError;
    }

    (profileRows ?? []).forEach((profile) => {
      profilesByUserId.set(profile.id, profile);
    });
  }

  (data ?? []).forEach((row) => {
    const list = summaryByTarget.get(row.target_id);
    if (!list) return;

    let entry = list.find((item) => item.emoji === row.emoji);
    if (!entry) {
      const createdEntry: ReactionSummary = {
        emoji: row.emoji,
        count: 0,
        reacted: false,
        previewUsers: [],
      };
      list.push(createdEntry);
      entry = createdEntry;
    }

    entry.count += 1;
    if (row.user_id === args.userId) {
      entry.reacted = true;
    }

    if (
      entry.previewUsers.length < REACTION_PREVIEW_LIMIT &&
      !entry.previewUsers.some((user) => user.userId === row.user_id)
    ) {
      const profile = profilesByUserId.get(row.user_id);
      entry.previewUsers.push({
        userId: row.user_id,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      });
    }
  });

  return summaryByTarget;
}

export async function listReactionActorsForTarget(args: {
  svc: SupabaseClient<Database>;
  targetId: string;
  orgId: string;
  emoji: SupportedReactionEmoji;
}) {
  const { data, error } = await args.svc
    .from("reactions")
    .select("user_id, created_at")
    .eq("target_id", args.targetId)
    .eq("org_id", args.orgId)
    .eq("emoji", args.emoji)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const userIds = Array.from(
    new Set((data ?? []).map((row) => row.user_id).filter(Boolean)),
  );
  if (userIds.length === 0) {
    return [] as ReactionActor[];
  }

  const { data: profiles, error: profilesError } = await args.svc
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    throw profilesError;
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  return userIds.map((userId) => {
    const profile = profileById.get(userId);
    return {
      userId,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
  });
}

export async function toggleTargetReaction(args: {
  svc: SupabaseClient<Database>;
  targetId: string;
  orgId: string;
  userId: string;
  emoji: SupportedReactionEmoji;
}) {
  const { data: existing, error: loadError } = await args.svc
    .from("reactions")
    .select("id")
    .eq("target_id", args.targetId)
    .eq("org_id", args.orgId)
    .eq("user_id", args.userId)
    .eq("emoji", args.emoji)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  if (existing) {
    const { error: deleteError } = await args.svc
      .from("reactions")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      throw deleteError;
    }

    return { removed: true as const };
  }

  const { error: insertError } = await args.svc.from("reactions").insert({
    target_id: args.targetId,
    org_id: args.orgId,
    user_id: args.userId,
    emoji: args.emoji,
  });

  if (insertError) {
    throw insertError;
  }

  return { removed: false as const };
}
