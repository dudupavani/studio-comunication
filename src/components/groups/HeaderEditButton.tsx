// src/components/groups/HeaderEditButton.tsx
"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditGroupModal from "@/components/groups/edit-group-modal";
import { Slot } from "@radix-ui/react-slot";

type Props = {
  group: {
    id: string;
    orgId: string;
    name: string;
    description: string | null;
    color: string | null;
  };
  asChild?: boolean;
  children?: ReactNode;
};

export default function HeaderEditButton({
  group,
  asChild,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {asChild ? (
        <Slot onClick={() => setOpen(true)}>{children}</Slot>
      ) : (
        <Button
          variant="outline"
          size="icon"
          aria-label="Editar grupo"
          onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      <EditGroupModal
        open={open}
        onOpenChange={setOpen}
        group={{
          id: group.id,
          orgId: group.orgId,
          name: group.name,
          description: group.description,
          color: group.color ?? "#3B82F6",
        }}
      />
    </>
  );
}
