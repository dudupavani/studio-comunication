"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  /** Server Action que recebe apenas (formData: FormData) */
  action: (formData: FormData) => Promise<any>;
  /** Campos hidden do form */
  hidden?: Record<string, string>;
  confirmText?: string;
  cancelText?: string;
  /** Se true, botão confirmar fica “destrutivo” */
  danger?: boolean;
};

export default function ConfirmDialog({
  trigger,
  title,
  description,
  action,
  hidden,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <form
          action={async (fd: FormData) => {
            await action(fd);
            setOpen(false);
          }}
          className="mt-2">
          {hidden &&
            Object.entries(hidden).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}>
              {cancelText}
            </Button>
            <Button type="submit" variant={danger ? "destructive" : "default"}>
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
