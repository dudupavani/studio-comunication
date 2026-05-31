import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { CommunitySegmentRow } from "@/lib/communities/permissions";

export type TypedSupabaseClient = SupabaseClient<Database>;

export function jsonError(status: number, message: string, details?: unknown) {
  if (status >= 500 || typeof details === "undefined") {
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ error: message, details }, { status });
}

export function normalizeUniqueViolation(message: string) {
  return message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplic");
}

export function isSameOriginRequest(req: Request) {
  const expectedOrigin = new URL(req.url).origin;
  const origin = req.headers.get("origin");

  if (origin) {
    return origin === expectedOrigin;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return false;
}

export async function loadMembershipSets(
  svc: TypedSupabaseClient,
  orgId: string,
  userId: string
) {
  const [groupMemberships, teamMemberships] = await Promise.all([
    svc
      .from("user_group_members")
      .select("group_id")
      .eq("org_id", orgId)
      .eq("user_id", userId),
    svc
      .from("equipe_members")
      .select("equipe_id")
      .eq("org_id", orgId)
      .eq("user_id", userId),
  ]);

  return {
    groupIds: new Set(
      (groupMemberships.data ?? [])
        .map((row: any) => row.group_id as string | null)
        .filter(Boolean) as string[]
    ),
    teamIds: new Set(
      (teamMemberships.data ?? [])
        .map((row: any) => row.equipe_id as string | null)
        .filter(Boolean) as string[]
    ),
  };
}

export function buildSegmentMap(rows: CommunitySegmentRow[]) {
  const byCommunity = new Map<string, CommunitySegmentRow[]>();

  rows.forEach((row) => {
    const current = byCommunity.get(row.community_id) ?? [];
    current.push(row);
    byCommunity.set(row.community_id, current);
  });

  return byCommunity;
}

export async function validateCommunitySegmentTargets(args: {
  svc: TypedSupabaseClient;
  orgId: string;
  segmentType: "group" | "team" | null;
  targetIds: string[];
}) {
  const targetIds = Array.from(new Set(args.targetIds.filter(Boolean)));
  if (!args.segmentType || targetIds.length === 0) {
    return true;
  }

  const query =
    args.segmentType === "group"
      ? args.svc.from("user_groups").select("id").eq("org_id", args.orgId)
      : args.svc.from("equipes").select("id").eq("org_id", args.orgId);

  const { data, error } = await query.in("id", targetIds);
  if (error) {
    throw error;
  }

  const foundIds = new Set((data ?? []).map((row) => row.id));
  return targetIds.every((targetId) => foundIds.has(targetId));
}
