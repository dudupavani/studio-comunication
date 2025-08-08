import { ProfileForm } from "@/components/profile/profile-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    // Handle error, maybe redirect to an error page or show a message
  }

  const userProfile: Profile = {
    id: user.id,
    email: user.email,
    full_name: profileData?.full_name || user.user_metadata.name || "",
    phone: profileData?.phone || "",
    avatar_url: profileData?.avatar_url || "",
    role: user.user_metadata.role || "user",
    created_at: user.created_at,
  };

  return (
    <div className="container mx-auto flex flex-col items-center">
      <div className="pt-12 w-7/12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Perfil
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerenciar dados da sua conta. Mantenha sempre atualizado.
          </p>
        </div>
        <div>
          <ProfileForm user={userProfile} />
        </div>
      </div>
    </div>
  );
}