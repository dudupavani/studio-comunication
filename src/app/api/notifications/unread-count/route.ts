import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";
import { countUnreadNotifications } from "@/lib/notifications/queries";

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    const count = await countUnreadNotifications(supabase, auth.userId, auth.orgId);
    return NextResponse.json({ count });
  } catch (err) {
    return handleRouteError(err);
  }
}
