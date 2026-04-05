import { z } from "zod";

const visibilitySchema = z.enum(["global", "segmented"]);
const segmentTypeSchema = z.enum(["group", "team"]);

const baseCommunitySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nome da comunidade é obrigatório")
      .max(120, "Nome da comunidade deve ter no máximo 120 caracteres"),
    visibility: visibilitySchema,
    segmentType: segmentTypeSchema.nullable().optional(),
    segmentTargetIds: z
      .array(z.string().uuid("Identificador de segmentação inválido"))
      .max(200, "Quantidade de segmentos acima do limite")
      .default([]),
    allowUnitMasterPost: z.boolean().default(true),
    allowUnitUserPost: z.boolean().default(false),
  })
  .superRefine((payload, ctx) => {
    const segmentType = payload.segmentType ?? null;
    const targetIds = payload.segmentTargetIds ?? [];

    if (payload.visibility === "global") {
      if (segmentType !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["segmentType"],
          message: "Comunidades globais não podem ter tipo de segmentação.",
        });
      }

      if (targetIds.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["segmentTargetIds"],
          message: "Comunidades globais não podem ter alvos de segmentação.",
        });
      }

      return;
    }

    if (!segmentType) {
      ctx.addIssue({
        code: "custom",
        path: ["segmentType"],
        message: "Selecione o tipo de segmentação da comunidade.",
      });
    }

    if (!targetIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["segmentTargetIds"],
        message: "Selecione ao menos um alvo de segmentação.",
      });
    }
  });

export const createCommunitySchema = baseCommunitySchema;
export const updateCommunitySchema = baseCommunitySchema;

export const communityParamsSchema = z.object({
  communityId: z.string().uuid("Identificador de comunidade inválido"),
});

export const createCommunitySpaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome do espaço é obrigatório")
    .max(120, "Nome do espaço deve ter no máximo 120 caracteres"),
  spaceType: z.enum(["publicacoes", "eventos"]),
});

export const updateCommunitySpaceSchema = createCommunitySpaceSchema;

export const communitySpaceParamsSchema = z.object({
  communityId: z.string().uuid("Identificador de comunidade inválido"),
  spaceId: z.string().uuid("Identificador de espaço inválido"),
});

export const communitySpacePostParamsSchema = communitySpaceParamsSchema.extend({
  postId: z.string().uuid("Identificador de publicação inválido"),
});

const postBlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("text"),
    content: z.string().max(50000),
  }),
  z.object({
    id: z.string(),
    type: z.literal("image"),
    imagePath: z.string(),
    imageUrl: z.string(),
    alt: z.string().max(500),
  }),
  z.object({
    id: z.string(),
    type: z.literal("attachment"),
    fileName: z.string(),
    sizeBytes: z.number().int().nonnegative(),
    mimeType: z.string(),
    filePath: z.string(),
    fileUrl: z.string(),
  }),
]);

export const createCommunitySpacePostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Título da publicação é obrigatório")
    .max(300, "Título deve ter no máximo 300 caracteres"),
  coverPath: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  blocks: z.array(postBlockSchema).max(100, "Limite de blocos excedido"),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type CreateCommunitySpaceInput = z.infer<typeof createCommunitySpaceSchema>;
export type UpdateCommunitySpaceInput = z.infer<typeof updateCommunitySpaceSchema>;
export type CreateCommunitySpacePostInput = z.infer<typeof createCommunitySpacePostSchema>;
