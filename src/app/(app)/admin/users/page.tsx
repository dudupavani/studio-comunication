// app/(app)/admin/users/page.tsx
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getUsers } from "@/lib/actions/user";
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
import Link from "next/link";
import { Pencil, MoreHorizontal, Trash, UserX, UserCheck } from "lucide-react";

// ⬇️ dialogs (client components)
import DisableUserDialog from "@/components/admin/disable-user-dialog";
import EnableUserDialog from "@/components/admin/enable-user-dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  // 🔐 se ainda precisa definir a senha no primeiro acesso, redireciona
  if (auth.user?.user_metadata?.must_set_password) {
    redirect("/auth/force-password");
  }

  const [users, isAdmin] = await Promise.all([getUsers(), isPlatformAdmin()]);
  if (!isAdmin) redirect("/profile");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-end mb-4">
        {isAdmin && auth?.orgId && <NewUserModal orgId={auth.orgId} />}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-md border">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/50 text-left">
              <TableHead className="px-4 py-3">Nome</TableHead>
              <TableHead className="px-4 py-3">Função</TableHead>
              <TableHead className="px-4 py-3">Registro</TableHead>
              <TableHead className="px-4 py-3 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!users || users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => (
                <TableRow key={user.id} className="border-t">
                  <TableCell className="px-4 py-3">
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
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <Badge
                      variant={
                        user?.disabled
                          ? "destructive"
                          : user.role === "platform_admin"
                          ? "default"
                          : "secondary"
                      }>
                      {user?.disabled ? "Desativado" : user.role ?? "user"}
                    </Badge>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-sm text-primary">
                    {user.created_at
                      ? format(
                          new Date(user.created_at),
                          "dd/MM/yyyy - HH:mm",
                          { locale: ptBR }
                        )
                      : "-"}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-md">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Editar */}
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/users/${user.id}/edit`}
                            className="flex items-center gap-2 cursor-pointer">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>

                        {/* Ativar / Desativar (com modal) */}
                        <DropdownMenuItem asChild>
                          {user?.disabled ? (
                            <EnableUserDialog
                              userId={user.id}
                              userName={user.full_name ?? user.email}
                              trigger={
                                <Link
                                  href="#"
                                  className="flex items-center gap-2">
                                  <UserCheck className="h-4 w-4" />
                                  Ativar
                                </Link>
                              }
                            />
                          ) : (
                            <DisableUserDialog
                              userId={user.id}
                              userName={user.full_name ?? user.email}
                              trigger={
                                <Link
                                  href="#"
                                  className="flex items-center gap-2">
                                  <UserX className="h-4 w-4" />
                                  Desativar
                                </Link>
                              }
                            />
                          )}
                        </DropdownMenuItem>

                        {/* Remover (placeholder) */}
                        <DropdownMenuItem asChild>
                          <Link
                            href="#"
                            className="w-full flex items-center text-destructive cursor-pointer">
                            <Trash className="h-4 w-4 mr-2" />
                            Remover
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
