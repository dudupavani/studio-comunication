import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  canManageCommunities,
  canPostInCommunity,
  canViewCommunityRecord,
  type CommunityRow,
  type CommunitySegmentRow,
} from "@/lib/communities/permissions";
import { communitySpaceParamsSchema } from "@/lib/communities/validations";
import { buildSegmentMap, jsonError, loadMembershipSets } from "@/lib/communities/api";

const POSTS_BUCKET = "posts";
const SIGNED_URL_TTL_IN_SECONDS = 60 * 60;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const POSTS_BUCKET_FILE_SIZE_LIMIT = "10MB";

const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "pif",
  "app",
  "dmg",
  "sh",
  "ps1",
  "vbs",
  "wsf",
  "wsh",
  "jar",
  "apk",
  "ipa",
  "zip",
]);

const BLOCKED_ATTACHMENT_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-dosexec",
  "application/x-executable",
  "application/x-msi",
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
]);

function sanitizeStorageFileName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 140) || "file"
  );
}

function extractFileExtension(fileName: string) {
  const segments = fileName.split(".");
  if (segments.length < 2) return "";
  return segments.pop()?.toLowerCase() ?? "";
}

function isBlockedAttachment(file: File) {
  const extension = extractFileExtension(file.name);
  const mimeType = (file.type || "").toLowerCase();
  return (
    BLOCKED_ATTACHMENT_EXTENSIONS.has(extension) ||
    BLOCKED_ATTACHMENT_MIME_TYPES.has(mimeType)
  );
}

function validatePathOwnership(args: {
  path: string;
  orgId: string;
  communityId: string;
  spaceId: string;
}) {
  const { path, orgId, communityId, spaceId } = args;
  const segments = path.split("/");
  if (segments.length < 4) return false;
  return (
    segments[0] === orgId && segments[1] === communityId && segments[2] === spaceId
  );
}

async function ensurePostsBucketExists(svc: ReturnType<typeof createServiceClient>) {
  const { error: getBucketError } = await svc.storage.getBucket(POSTS_BUCKET);

  if (!getBucketError) {
    return;
  }

  const isNotFound =
    getBucketError.message.toLowerCase().includes("not found") ||
    getBucketError.message.toLowerCase().includes("does not exist");

  if (!isNotFound) {
    throw getBucketError;
  }

  const { error: createBucketError } = await svc.storage.createBucket(POSTS_BUCKET, {
    public: false,
    fileSizeLimit: POSTS_BUCKET_FILE_SIZE_LIMIT,
  });

  if (
    createBucketError &&
    !createBucketError.message.toLowerCase().includes("already exists")
  ) {
    throw createBucketError;
  }
}

function normalizeStorageUploadError(errorMessage: string) {
  const message = errorMessage.toLowerCase();

  if (
    message.includes("mime") ||
    message.includes("content type") ||
    message.includes("not allowed")
  ) {
    return {
      status: 400,
      error:
        "Tipo de arquivo não permitido no bucket de publicações. Verifique os tipos MIME permitidos para o bucket posts.",
    };
  }

  if (
    message.includes("too large") ||
    message.includes("file size") ||
    message.includes("payload too large") ||
    message.includes("exceeded")
  ) {
    return {
      status: 400,
      error: "Arquivo excede o limite de 10MB.",
    };
  }

  return {
    status: 500,
    error: "Falha ao enviar arquivo.",
  };
}

async function ensureUploadAccess(
  params: { communityId: string; spaceId: string },
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
) {
  const svc = createServiceClient();
  const canManage = canManageCommunities(auth);

  const [communityRes, segmentsRes, spaceRes, memberships] = await Promise.all([
    svc
      .from("communities")
      .select(
        "id, org_id, visibility, segment_type, allow_unit_master_post, allow_unit_user_post",
      )
      .eq("id", params.communityId)
      .maybeSingle(),
    svc
      .from("community_segments")
      .select("community_id, org_id, target_type, target_id, created_at")
      .eq("community_id", params.communityId),
    svc
      .from("community_spaces")
      .select("id, community_id, org_id")
      .eq("id", params.spaceId)
      .eq("community_id", params.communityId)
      .maybeSingle(),
    canManage
      ? Promise.resolve({ groupIds: new Set<string>(), teamIds: new Set<string>() })
      : loadMembershipSets(svc, auth.orgId!, auth.userId),
  ]);

  if (communityRes.error) {
    throw new Error("Falha ao validar comunidade.");
  }
  if (segmentsRes.error) {
    throw new Error("Falha ao validar segmentação da comunidade.");
  }
  if (spaceRes.error) {
    throw new Error("Falha ao validar espaço.");
  }

  const community = (communityRes.data ?? null) as CommunityRow | null;
  const space = spaceRes.data ?? null;

  if (!community || community.org_id !== auth.orgId) {
    return { ok: false as const, status: 404, error: "Comunidade não encontrada." };
  }

  if (!space || space.org_id !== auth.orgId) {
    return { ok: false as const, status: 404, error: "Espaço não encontrado." };
  }

  const segments = (segmentsRes.data ?? []) as CommunitySegmentRow[];
  const segmentMap = buildSegmentMap(segments);
  const segmentTargetIds = (segmentMap.get(params.communityId) ?? []).map(
    (segment) => segment.target_id,
  );

  const canView = canViewCommunityRecord({
    auth,
    community,
    segmentTargetIds,
    memberships,
  });

  if (!canView) {
    return {
      ok: false as const,
      status: 403,
      error: "Você não tem acesso a esta comunidade.",
    };
  }

  if (!canPostInCommunity(auth, community)) {
    return {
      ok: false as const,
      status: 403,
      error: "Você não tem permissão para publicar nesta comunidade.",
    };
  }

  return { ok: true as const, community };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ communityId: string; spaceId: string }> },
) {
  try {
    const parsedParams = communitySpaceParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    const userSupabase = createServerClientWithCookies();
    const auth = await getAuthContext(userSupabase);

    if (!auth) {
      return jsonError(401, "Sessão inválida.");
    }

    if (!auth.orgId) {
      return jsonError(400, "Não foi possível determinar a organização ativa.");
    }

    const access = await ensureUploadAccess(parsedParams.data, auth);
    if (!access.ok) {
      return jsonError(access.status, access.error);
    }

    const formData = await req.formData();
    const rawKind = String(formData.get("kind") ?? "").trim();
    const kind = rawKind === "cover" || rawKind === "image" || rawKind === "attachment"
      ? rawKind
      : null;

    if (!kind) {
      return jsonError(400, "Tipo de upload inválido.");
    }

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return jsonError(400, "Arquivo não enviado.");
    }

    if (fileEntry.size <= 0) {
      return jsonError(400, "Arquivo inválido.");
    }

    if (fileEntry.size > MAX_UPLOAD_SIZE) {
      return jsonError(400, "Arquivo excede o limite de 10MB.");
    }

    if ((kind === "cover" || kind === "image") && !fileEntry.type.startsWith("image/")) {
      return jsonError(400, "Somente imagens são permitidas neste upload.");
    }

    if (kind === "attachment" && isBlockedAttachment(fileEntry)) {
      return jsonError(
        400,
        "Não é permitido anexar arquivos executáveis ou arquivos .zip.",
      );
    }

    const safeName = sanitizeStorageFileName(fileEntry.name);
    const path = `${auth.orgId}/${parsedParams.data.communityId}/${parsedParams.data.spaceId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const contentType = fileEntry.type || "application/octet-stream";

    const svc = createServiceClient();
    await ensurePostsBucketExists(svc);
    const { error: uploadError } = await svc.storage.from(POSTS_BUCKET).upload(path, fileEntry, {
      upsert: false,
      cacheControl: "3600",
      contentType,
    });

    if (uploadError) {
      console.error("COMMUNITY_UPLOAD_POSTS_BUCKET_ERROR", uploadError);
      const normalizedError = normalizeStorageUploadError(uploadError.message);
      return jsonError(normalizedError.status, normalizedError.error);
    }

    const { data: signedData, error: signedError } = await svc.storage
      .from(POSTS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_IN_SECONDS);

    if (signedError || !signedData?.signedUrl) {
      await svc.storage.from(POSTS_BUCKET).remove([path]);
      if (signedError) {
        console.error("COMMUNITY_UPLOAD_SIGNED_URL_ERROR", signedError);
      }
      return jsonError(500, "Falha ao gerar URL assinada.");
    }

    return NextResponse.json({
      item: {
        kind,
        path,
        url: signedData.signedUrl,
        mimeType: contentType,
        fileName: fileEntry.name,
        sizeBytes: fileEntry.size,
      },
    });
  } catch (error) {
    console.error("COMMUNITY_UPLOAD_UNEXPECTED_ERROR", error);
    return jsonError(500, "Falha inesperada no upload.", error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ communityId: string; spaceId: string }> },
) {
  try {
    const parsedParams = communitySpaceParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    const userSupabase = createServerClientWithCookies();
    const auth = await getAuthContext(userSupabase);

    if (!auth) {
      return jsonError(401, "Sessão inválida.");
    }

    if (!auth.orgId) {
      return jsonError(400, "Não foi possível determinar a organização ativa.");
    }

    const access = await ensureUploadAccess(parsedParams.data, auth);
    if (!access.ok) {
      return jsonError(access.status, access.error);
    }

    const body = await req.json().catch(() => null);
    const path = typeof body?.path === "string" ? body.path.trim() : "";

    if (!path) {
      return jsonError(400, "Path do arquivo é obrigatório.");
    }

    if (
      !validatePathOwnership({
        path,
        orgId: auth.orgId,
        communityId: parsedParams.data.communityId,
        spaceId: parsedParams.data.spaceId,
      })
    ) {
      return jsonError(403, "Você não pode remover este arquivo.");
    }

    const svc = createServiceClient();
    const { error } = await svc.storage.from(POSTS_BUCKET).remove([path]);

    if (error) {
      return jsonError(500, "Falha ao remover arquivo.", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao remover arquivo.", error);
  }
}
