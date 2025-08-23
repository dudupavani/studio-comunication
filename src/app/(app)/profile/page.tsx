import { ProfileForm } from "@/components/profile/profile-form";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";
import { getLoggedUserProfile } from "@/lib/queries/profile";

export default async function ProfilePage() {
  const { user, profile: profileData, error: profileError } = await getLoggedUserProfile();

  if (!user) {
    redirect("/login");
  }

  if (profileError) {
    // Error already logged by getLoggedUserProfile
    // Handle error, maybe redirect to an error page or show a message
  }

  const userProfile: Profile = {
    id: user.id,
    email: user.email,
    full_name: profileData?.full_name || user.user_metadata.name || "",
    phone: profileData?.phone || "",
    avatar_url: profileData?.avatar_url || "",
    created_at: user.created_at,
  };

  console.log("ProfilePage: userProfile.avatar_url", userProfile.avatar_url);

  return (
    <div className="pt-8 px-6 sm:px-12 w-7/12 w-full sm:max-w-3xl">
      <div>
        <ProfileForm user={userProfile} />
      </div>
    </div>
  );
}
