"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SignUpForm } from "@/components/auth/signup-form";

export function NewUserModal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSignUpSuccess = () => {
    setIsOpen(false);
    // Optionally, revalidate the users list after a new user is created
    // This would require a server action to revalidatePath('/admin/users')
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar novo usuário</DialogTitle>
        </DialogHeader>
        <SignUpForm onSuccess={handleSignUpSuccess} />
      </DialogContent>
    </Dialog>
  );
}
