import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";
import {
  listNotifications,
} from "@/lib/notifications/queries";
import {
  listNotificationsQuerySchema,
  notificationTypeSchema,
} from "@/lib/notifications/validations";
import type { NotificationType } from "@/lib/notifications";

function parseTypes(searchParams: URLSearchParams): NotificationType[] {
  const rawTypes = new Set<string>();
  const typeParams = searchParams.getAll("type");
  typeParams.forEach((value) => rawTypes.add(value));

  const listParam = searchParams.get("types");
  if (listParam) {
    listParam.split(",").forEach((value) => {
      if (value) rawTypes.add(value);
    });
  }

  const valid: NotificationType[] = [];
  rawTypes.forEach((value) => {
    const parsed = notificationTypeSchema.safeParse(value);
    if (parsed.success) valid.push(parsed.data as NotificationType);
  });

  return valid;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const search = req.nextUrl.searchParams;
    const limitParam = search.get("limit");
    const cursor = search.get("cursor") ?? undefined;
    const unreadParam = search.get("unread");

    const parsed = listNotificationsQuerySchema.safeParse({
      limit: limitParam ? Number(limitParam) : undefined,
      cursor,
      unread: unreadParam === "true" || unreadParam === "1",
      types: parseTypes(search),
    });

    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Parâmetros inválidos"
      );
    }

    const { limit, unread, types, cursor: parsedCursor } = parsed.data;
    const parsedTypes = types as NotificationType[] | undefined;

    const result = await listNotifications(supabase, auth.userId, auth.orgId, {
      limit,
      cursor: parsedCursor,
      unreadOnly: unread,
      types: parsedTypes,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
