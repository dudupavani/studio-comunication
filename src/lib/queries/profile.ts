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

  const { data: profile, error: profileError, status } = await supabase
    .from("profiles")
    .select("id, full_name, role, org_id, phone, avatar_url, email, created_at")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const loggableError = toLoggableError(profileError);
  const hasRealError = !!profileError && !!loggableError?.message && loggableError.message !== "Empty error object";

  if (hasRealError) {
    logError("getLoggedUserProfile — profiles select failed:", profileError);
  } else if (!profile) {
    console.warn("getLoggedUserProfile — no profile or RLS", {
      status,
      userId: user.id,
    });
  }

  return { user, profile, error: hasRealError ? profileError : null, status };
}