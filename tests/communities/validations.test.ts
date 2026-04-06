import {
  communityParamsSchema,
  createCommunitySchema,
  createCommunitySpacePostSchema,
  createCommunitySpaceSchema,
} from "@/lib/communities/validations";

describe("lib/communities/validations", () => {
  it("accepts segmented community with segment type and targets", () => {
    const parsed = createCommunitySchema.safeParse({
      name: "Engenharia",
      visibility: "segmented",
      segmentType: "group",
      segmentTargetIds: ["4c7b2366-2d9a-4ef5-9bd4-4f0ea8c1d321"],
      allowUnitMasterPost: true,
      allowUnitUserPost: false,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects global community with segment fields", () => {
    const parsed = createCommunitySchema.safeParse({
      name: "Comunidade Global",
      visibility: "global",
      segmentType: "team",
      segmentTargetIds: ["4c7b2366-2d9a-4ef5-9bd4-4f0ea8c1d321"],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message);
      expect(messages).toContain(
        "Comunidades globais não podem ter tipo de segmentação.",
      );
      expect(messages).toContain(
        "Comunidades globais não podem ter alvos de segmentação.",
      );
    }
  });

  it("rejects segmented community without segment type and targets", () => {
    const parsed = createCommunitySchema.safeParse({
      name: "Segmentada",
      visibility: "segmented",
      segmentType: null,
      segmentTargetIds: [],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message);
      expect(messages).toContain(
        "Selecione o tipo de segmentação da comunidade.",
      );
      expect(messages).toContain(
        "Selecione ao menos um alvo de segmentação.",
      );
    }
  });

  it("validates community and space ids in params", () => {
    expect(
      communityParamsSchema.safeParse({
        communityId: "7b75f7a7-779f-4db2-a4a0-2f72a5f6ec85",
      }).success,
    ).toBe(true);
    expect(
      communityParamsSchema.safeParse({
        communityId: "invalid-id",
      }).success,
    ).toBe(false);
  });

  it("validates space and post payload shapes", () => {
    expect(
      createCommunitySpaceSchema.safeParse({
        name: "Geral",
        spaceType: "publicacoes",
      }).success,
    ).toBe(true);

    expect(
      createCommunitySpacePostSchema.safeParse({
        title: "Primeira publicação",
        coverPath: null,
        coverUrl: null,
        blocks: [
          {
            id: "b1",
            type: "text",
            content: "Olá",
          },
        ],
      }).success,
    ).toBe(true);
  });
});
