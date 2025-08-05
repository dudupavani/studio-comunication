import { EditUserForm } from "@/components/admin/edit-user-form"
import { getUserById } from "@/lib/actions/user"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function EditUserPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getUserById(params.id)

  if (!user) {
    notFound()
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
            <Link href="/admin">
                <ArrowLeft className="w-4 h-4" />
            </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Edit User</h1>
            <p className="text-muted-foreground">Modify user details and role.</p>
        </div>
      </div>
      <div className="max-w-xl">
        <EditUserForm user={user} />
      </div>
    </div>
  )
}
