"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import CourseCoverUploader from "./CourseCoverUploader";

type Props = {
  courseId: string;
  initial: {
    title: string;
    description: string | null;
    cover_url: string | null;
    carga_horaria: number | null;
    status: string;
    tags: string[];
  };
};

export function CourseDetailsForm({ courseId, initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [cargaHoraria, setCargaHoraria] = useState(
    initial.carga_horaria ? String(initial.carga_horaria) : ""
  );
  const [tags, setTags] = useState(initial.tags?.join(", ") ?? "");
  const [status, setStatus] = useState(initial.status);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submit = async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          carga_horaria: cargaHoraria ? Number(cargaHoraria) : null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          status,
        };
        const res = await fetch(`/api/learning/courses/${courseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Erro ao salvar");
        toast({ title: "Curso atualizado" });
        router.refresh();
      } catch (err: any) {
        toast({
          title: "Erro",
          description: String(err?.message || err),
          variant: "destructive",
        });
      }
    };
    startTransition(() => {
      void submit();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Capa do curso</Label>
        <CourseCoverUploader
          courseId={courseId}
          initialUrl={initial.cover_url}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Descrição</Label>
        <Textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Resumo do curso"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="carga">Carga horária (h)</Label>
        <Input
          id="carga"
          type="number"
          min={0}
          value={cargaHoraria}
          onChange={(e) => setCargaHoraria(e.target.value)}
          placeholder="4"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="onboarding,segurança"
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}

export default CourseDetailsForm;
