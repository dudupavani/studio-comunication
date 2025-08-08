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

export default async function AdminPage() {
  const users = await getUsers();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  return (
    <div className="pt-8 pb-12 px-6">
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
