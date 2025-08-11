// src/components/ui/confirm-dialog.tsx
"use client";

import * as React from "react";

type Hidden = Record<string, string>;

type Props = {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
  action: (formData: FormData) => Promise<any>;
  hidden?: Hidden; // campos hidden enviados para a action
};

export default function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = "Confirmar",
  danger,
  action,
  hidden = {},
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center">
        {trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border px-3 py-2 hover:bg-muted">
                Cancelar
              </button>

              <form
                action={async (fd) => {
                  await action(fd);
                  // se a action fizer redirect, não chega aqui; caso não, fecha
                  setOpen(false);
                }}>
                {Object.entries(hidden).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <button
                  type="submit"
                  className={`rounded-md px-3 py-2 text-white ${
                    danger
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-black hover:bg-black/90"
                  }`}>
                  {confirmText}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
