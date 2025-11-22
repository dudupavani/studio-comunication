import { createClient } from "@/lib/supabase/server";
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

  const { data: profileRow, error: profileError, status } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, created_at, global_role")
    .eq("id", user.id)
    .maybeSingle();

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
