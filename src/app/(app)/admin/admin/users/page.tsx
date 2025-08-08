import { getAllProfiles } from "@/lib/actions/user";
import { UsersTable } from "@/components/admin/users-table";
import { NewUserModal } from "@/components/admin/new-user-modal";
import { Button } from "@/components/ui/button";

export default async function UsersPage() {
  const users = await getAllProfiles();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Usuários</h1>
        <NewUserModal>
          <Button>Novo Usuário</Button>
        </NewUserModal>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
