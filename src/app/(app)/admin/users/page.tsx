// app/(app)/admin/users/page.tsx
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getUsers } from "@/lib/actions/user"; // ✅ nome correto
import { isPlatformAdmin } from "@/lib/actions/admin";
import NewUserModal from "@/components/admin/new-user-modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  // 🔐 NOVO: se ainda precisa definir a senha no primeiro acesso, redireciona
  if (auth.user?.user_metadata?.must_set_password) {
    redirect("/auth/force-password");
  }

  const [users, isAdmin] = await Promise.all([getUsers(), isPlatformAdmin()]);
  console.log("DEBUG isAdmin:", isAdmin);

  if (!isAdmin) redirect("/profile"); // 🔒 Protege a página

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-end mb-4">
        {isAdmin && auth?.orgId && <NewUserModal orgId={auth.orgId} />}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!users || users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || "Avatar"}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {(user.full_name ?? "NN")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm">
                          {user.full_name || "No name"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        user.role === "platform_admin" ? "default" : "secondary"
                      }>
                      {user.role ?? "user"}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-sm text-primary">
                    {user.created_at
                      ? format(
                          new Date(user.created_at),
                          "dd/MM/yyyy - HH:mm",
                          { locale: ptBR }
                        )
                      : "-"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-md">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
