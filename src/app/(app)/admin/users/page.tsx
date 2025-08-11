import { getUsers } from "@/lib/actions/user";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserActions } from "@/components/admin/user-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NewUserModal } from "@/components/admin/new-user-modal";
import { Button } from "@/components/ui/button";
import { CirclePlus } from "lucide-react";

export default async function AdminUsersPage() {
  const users = await getUsers();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <div className="pt-8 pb-12 px-6 space-y-4">
      {/* Header com ação */}
      <div className="flex items-center justify-end">
        <NewUserModal>
          <Button>
            <CirclePlus />
            Usuário
          </Button>
        </NewUserModal>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage
                      src={user.avatar_url || undefined}
                      alt={user.full_name || user.email}
                    />
                    <AvatarFallback>
                      {getInitials(user.full_name || user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  {user.full_name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(user.created_at), "dd/MM/yyyy - HH:mm", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <UserActions userId={user.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {users.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          No users found.
        </div>
      )}
    </div>
  );
}
