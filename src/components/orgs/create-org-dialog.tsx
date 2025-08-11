"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FormDialog from "@/components/shared/form-dialog";
import { createOrgAndGo } from "@/app/(app)/orgs/actions";
import { Plus } from "lucide-react";

export default function CreateOrgDialog() {
  return (
    <FormDialog
      trigger={
        <Button>
          <Plus />
          Criar
        </Button>
      }
      title="Criar organização"
      action={createOrgAndGo}
      submitText="Criar">
      <Input name="name" placeholder="Nome da organização" />
    </FormDialog>
  );
}
