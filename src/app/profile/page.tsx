import { ProfileForm } from "@/components/profile/profile-form"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">My Profile</h1>
      <p className="text-muted-foreground">Manage your account settings.</p>
      <div className="max-w-xl pt-8">
        <ProfileForm user={user} />
      </div>
    </div>
  )
}
