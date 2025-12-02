import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logError, toLoggableError } from "@/lib/log";
import type { Profile } from "@/lib/types";

export type UserProfile = Profile;

export async function getLoggedUserProfile() {
  const supabase = await createClient();
  const { data: userRes, error: userError } = await supabase.auth.getUser();
  if (userError) {
    logError("getLoggedUserProfile — getUser failed:", userError);
    return { user: null, profile: null, error: userError, status: 401 };
  }
  const user = userRes?.user ?? null;
  if (!user) return { user: null, profile: null, error: null, status: 401 };

  let {
    data: profileRow,
    error: profileError,
    status,
  } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, created_at, global_role")
    .eq("id", user.id)
    .maybeSingle();

  // Se não veio dado (mesmo sem erro), tenta via service role para evitar cenários em que o RLS bloqueia o próprio usuário
  if (!profileRow && !profileError) {
    const svc = createServiceClient();
    const { data: svcData, error: svcError, status: svcStatus } = await svc
      .from("profiles")
      .select("id, full_name, phone, avatar_url, created_at, global_role")
      .eq("id", user.id)
      .maybeSingle();

    if (svcData) {
      profileRow = svcData;
      status = svcStatus ?? status;
    }
    profileError = svcError;
  }

  const conditionedProfile = profileRow
    ? {
        ...(profileRow as any),
        avatar_url:
          profileRow.avatar_url === "__KEEP_AVATAR__"
            ? null
            : profileRow.avatar_url,
      }
    : null;

  const loggableError = toLoggableError(profileError);
  const hasRealError = !!profileError && !!loggableError?.message && loggableError.message !== "Empty error object";

  if (hasRealError) {
    logError("getLoggedUserProfile — profiles select failed:", profileError);
  } else if (!conditionedProfile) {
    console.warn("getLoggedUserProfile — no profile or RLS", {
      status,
      userId: user.id,
    });
  }

  return {
    user,
    profile: conditionedProfile as Profile | null,
    error: hasRealError ? profileError : null,
    status,
  };
}
