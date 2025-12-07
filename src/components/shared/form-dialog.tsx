"use client";

import { useServerActionState } from "@/hooks/use-server-action-state";
import Modal from "./modal";
import { Button } from "@/components/ui/button";

type FormState = { ok?: boolean; error?: string };

type Props = {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode; // inputs do formulário
  submitText?: string;
};

export default function FormDialog({
  trigger,
  title,
  description,
  action,
  children,
  submitText = "Salvar",
}: Props) {
  const [state, formAction] = useServerActionState(action, {});

  return (
    <Modal
      trigger={trigger}
      title={title}
      description={description}
      size="md"
      footer={
        <>
          <Button form="__modal_form" type="submit">
            {submitText}
          </Button>
          <Button form="__modal_form" variant="ghost" type="reset">
            Cancelar
          </Button>
        </>
      }>
      <form
        id="__modal_form"
        // @ts-expect-error Server Action
        action={formAction}
        className="grid gap-3">
        {children}
        {state?.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
