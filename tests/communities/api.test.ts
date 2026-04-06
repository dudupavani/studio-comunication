import {
  buildSegmentMap,
  jsonError,
  loadMembershipSets,
  normalizeUniqueViolation,
} from "@/lib/communities/api";

describe("lib/communities/api", () => {
  it("jsonError returns details for non-5xx and omits details for 5xx", async () => {
    const badRequest = jsonError(400, "Payload inválido", { field: "name" });
    const badRequestBody = await badRequest.json();
    expect(badRequest.status).toBe(400);
    expect(badRequestBody).toEqual({
      error: "Payload inválido",
      details: { field: "name" },
    });

    const internal = jsonError(500, "Falha interna", { raw: "db-error" });
    const internalBody = await internal.json();
    expect(internal.status).toBe(500);
    expect(internalBody).toEqual({ error: "Falha interna" });
  });

  it("normalizeUniqueViolation detects unique and duplicate messages", () => {
    expect(normalizeUniqueViolation("duplicate key value violates unique")).toBe(
      true,
    );
    expect(normalizeUniqueViolation("registro duplicado no índice")).toBe(true);
    expect(normalizeUniqueViolation("timeout de conexão")).toBe(false);
  });

  it("buildSegmentMap groups rows by community id", () => {
    const map = buildSegmentMap([
      {
        community_id: "community-1",
        org_id: "org-1",
        target_type: "group",
        target_id: "group-1",
        created_at: "2026-01-01T00:00:00.000Z",
      } as any,
      {
        community_id: "community-1",
        org_id: "org-1",
        target_type: "group",
        target_id: "group-2",
        created_at: "2026-01-01T00:00:00.000Z",
      } as any,
      {
        community_id: "community-2",
        org_id: "org-1",
        target_type: "team",
        target_id: "team-1",
        created_at: "2026-01-01T00:00:00.000Z",
      } as any,
    ]);

    expect(map.get("community-1")?.map((row) => row.target_id)).toEqual([
      "group-1",
      "group-2",
    ]);
    expect(map.get("community-2")?.map((row) => row.target_id)).toEqual([
      "team-1",
    ]);
  });

  it("loadMembershipSets returns groupIds and teamIds sets", async () => {
    const fakeSvc = {
      from: jest.fn((table: string) => {
        if (table === "user_group_members") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ group_id: "group-1" }, { group_id: null }],
                }),
              }),
            }),
          };
        }

        if (table === "equipe_members") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ equipe_id: "team-1" }, { equipe_id: null }],
                }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const memberships = await loadMembershipSets(
      fakeSvc as any,
      "org-1",
      "user-1",
    );

    expect(fakeSvc.from).toHaveBeenCalledWith("user_group_members");
    expect(fakeSvc.from).toHaveBeenCalledWith("equipe_members");
    expect([...memberships.groupIds]).toEqual(["group-1"]);
    expect([...memberships.teamIds]).toEqual(["team-1"]);
  });
});
