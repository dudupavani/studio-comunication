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
import { UserActions } from "@/components/admin/user-actions";

export default async function AdminPage() {
  const users = await getUsers();

  return (
    <div className="container-xl mx-auto pt-8 pb-12 px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Users
          </h1>
          <p className="text-muted-foreground">
            Gerencie os usuários cadastrados
          </p>
        </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(user.created_at), "MMMM d, yyyy")}
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