// src/components/units/add-unit-modal.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddUnitModal({
  orgId,
  slug,
  action,
}: {
  orgId: string;
  slug: string;
  action: (formData: FormData) => Promise<void>; // server action (createUnitAction)
}) {
  const [open, setOpen] = React.useState(false);

  // fecha o modal após submit (a navegação/redirect do server action recarrega a página)
  async function handleAction(fd: FormData) {
    await action(fd);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus size={22} />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova unidade</DialogTitle>
        </DialogHeader>

        <form action={handleAction} className="grid gap-4">
          <Input name="name" placeholder="Nome da unidade" required autoFocus />
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="slug" value={slug} />

          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
