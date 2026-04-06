import type { AuthContext } from "@/lib/auth-context";
import {
  canManageCommunities,
  canPostInCommunity,
  canViewCommunityRecord,
  hasSegmentMatch,
} from "@/lib/communities/permissions";

const makeAuth = (overrides: Partial<AuthContext> = {}): AuthContext =>
  ({
    userId: "user-1",
    orgId: "org-1",
    orgRole: null,
    platformRole: null,
    unitIds: [],
    ...overrides,
  }) as AuthContext;

describe("lib/communities/permissions", () => {
  it("canManageCommunities allows platform admin, org admin and org master", () => {
    expect(canManageCommunities(null)).toBe(false);
    expect(
      canManageCommunities(makeAuth({ platformRole: "platform_admin" })),
    ).toBe(true);
    expect(canManageCommunities(makeAuth({ orgRole: "org_admin" }))).toBe(
      true,
    );
    expect(canManageCommunities(makeAuth({ orgRole: "org_master" }))).toBe(
      true,
    );
    expect(canManageCommunities(makeAuth({ orgRole: "unit_user" }))).toBe(
      false,
    );
  });

  it("canPostInCommunity respects role and community flags", () => {
    const community = {
      allow_unit_master_post: true,
      allow_unit_user_post: false,
    };

    expect(canPostInCommunity(null, community)).toBe(false);
    expect(
      canPostInCommunity(makeAuth({ platformRole: "platform_admin" }), community),
    ).toBe(true);
    expect(canPostInCommunity(makeAuth({ orgRole: "org_admin" }), community)).toBe(
      true,
    );
    expect(
      canPostInCommunity(makeAuth({ orgRole: "org_master" }), community),
    ).toBe(true);
    expect(
      canPostInCommunity(makeAuth({ orgRole: "unit_master" }), community),
    ).toBe(true);
    expect(canPostInCommunity(makeAuth({ orgRole: "unit_user" }), community)).toBe(
      false,
    );
    expect(
      canPostInCommunity(
        makeAuth({ orgRole: "unit_user" }),
        {
          allow_unit_master_post: false,
          allow_unit_user_post: true,
        },
      ),
    ).toBe(true);
  });

  it("hasSegmentMatch checks memberships by segment type", () => {
    const memberships = {
      groupIds: new Set(["group-1"]),
      teamIds: new Set(["team-1"]),
    };

    expect(hasSegmentMatch(null, ["group-1"], memberships)).toBe(false);
    expect(hasSegmentMatch("group", ["group-1"], memberships)).toBe(true);
    expect(hasSegmentMatch("group", ["group-2"], memberships)).toBe(false);
    expect(hasSegmentMatch("team", ["team-1"], memberships)).toBe(true);
    expect(hasSegmentMatch("team", ["team-2"], memberships)).toBe(false);
  });

  it("canViewCommunityRecord allows managers, global communities and segmented matches", () => {
    const memberships = {
      groupIds: new Set(["group-1"]),
      teamIds: new Set<string>(),
    };

    expect(
      canViewCommunityRecord({
        auth: makeAuth({ orgRole: "org_admin" }),
        community: { visibility: "segmented", segment_type: "group" },
        segmentTargetIds: [],
        memberships,
      }),
    ).toBe(true);

    expect(
      canViewCommunityRecord({
        auth: makeAuth({ orgRole: "unit_user" }),
        community: { visibility: "global", segment_type: null },
        segmentTargetIds: [],
        memberships,
      }),
    ).toBe(true);

    expect(
      canViewCommunityRecord({
        auth: makeAuth({ orgRole: "unit_user" }),
        community: { visibility: "segmented", segment_type: "group" },
        segmentTargetIds: ["group-1"],
        memberships,
      }),
    ).toBe(true);

    expect(
      canViewCommunityRecord({
        auth: makeAuth({ orgRole: "unit_user" }),
        community: { visibility: "segmented", segment_type: "group" },
        segmentTargetIds: ["group-2"],
        memberships,
      }),
    ).toBe(false);
  });
});
