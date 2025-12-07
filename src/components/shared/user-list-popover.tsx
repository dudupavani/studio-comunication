import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type CompactUser = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export function UserListPopover({
  users,
  maxPreview = 3,
  className,
}: {
  users: CompactUser[];
  maxPreview?: number;
  className?: string;
}) {
  if (!users.length) {
    return <span className="text-xs font-medium text-muted-foreground">0</span>;
  }

  const preview = users.slice(0, maxPreview);
  const remaining = users.length - preview.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1 rounded-full bg-transparent border border-transparent pl-1 pr-2 py-1 transition hover:bg-white hover:border-gray-200 ${
            className ?? ""
          }`}>
          <div className="flex -space-x-3">
            {preview.map((user) => (
              <Avatar key={user.id} className="h-8 w-8 border-2 border-white ">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <Badge variant="secondary" className="rounded-full">
            {remaining > 0 ? `+${remaining}` : users.length}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" sideOffset={8}>
        <div className="max-h-70 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-medium">
                  {user.name ?? "Sem nome"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getInitials(name?: string | null) {
  if (!name) return "??";
  const trimmed = name.trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/[\s]+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const initials = `${first}${second}`.toUpperCase();
  return initials || trimmed[0]?.toUpperCase() || "??";
}

