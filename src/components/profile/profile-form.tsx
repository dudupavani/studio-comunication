"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMaskInput } from "react-imask";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "../ui/card";
import { ImageCropper } from "./image-cropper";
import type { Profile } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email(),
  phone: z.string().optional(),
});

export function ProfileForm({ user }: { user: Profile }) {
  const { toast } = useToast();
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(
    user.avatar_url || null
  );
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("name", values.name);

    if (values.email !== user.email) {
      formData.append("email", values.email);
    }
    if (values.phone) {
      formData.append("phone", values.phone);
    }

    if (croppedImage) {
      // 🔧 Envie um File com nome e tipo garantidos
      const file = new File([croppedImage], "avatar.jpg", {
        type: "image/jpeg",
      });
      formData.append("avatar", file);
    } else if (isAvatarRemoved) {
      formData.append("avatar", "REMOVE"); // sinaliza remoção
    }

    let response: { error?: string | null } | null = null;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        body: formData,
      });
      response = (await res.json().catch(() => null)) as
        | { error?: string | null }
        | null;
      if (!res.ok && (!response || !response.error)) {
        throw new Error("Falha ao atualizar perfil.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao atualizar perfil.";
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: message,
      });
      return;
    }

    const { error } = response ?? { error: "Falha ao atualizar perfil." };

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error,
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      if (croppedImage) {
        // atualiza preview local sem depender do retorno
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(croppedImage);
      } else if (isAvatarRemoved) {
        setPreview(null);
      }
      setIsAvatarRemoved(false);
      form.reset(values); // limpa estado "dirty" após salvar
    }
  }

  const handleCrop = (blob: Blob) => {
    setCroppedImage(blob);
    setPreview(URL.createObjectURL(blob));
    setIsAvatarRemoved(false);
  };

  const handleRemoveImage = () => {
    setCroppedImage(null);
    setPreview(null);
    setIsAvatarRemoved(true);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col items-center">
              <ImageCropper
                onCrop={handleCrop}
                preview={preview}
                onRemove={handleRemoveImage}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} readOnly disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular</FormLabel>
                  <FormControl>
                    <IMaskInput
                      mask="(00) 00000-0000"
                      placeholder="(00) 00000-0000"
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting ||
                  (!form.formState.isDirty && !croppedImage && !isAvatarRemoved)
                }>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
