"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function CourseCreateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [cargaHoraria, setCargaHoraria] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          cover_url: coverUrl.trim() || null,
          carga_horaria: cargaHoraria ? Number(cargaHoraria) : null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        };

        const res = await fetch("/api/learning/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Falha ao criar curso");

        const courseId = json.data?.id ?? json.data?.course_id ?? "";
        toast({ title: "Curso criado", description: payload.title });
        router.push(`/learning/admin/courses/${courseId}`);
        router.refresh();
      } catch (err: any) {
        toast({ title: "Erro", description: String(err?.message || err), variant: "destructive" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Ex.: Onboarding da empresa"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Resumo curto do curso"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="onboarding,segurança,produto"
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover">URL da capa (opcional)</Label>
        <Input
          id="cover"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Criar curso"}
        </Button>
        <p className="text-xs text-muted-foreground">O curso é criado como rascunho.</p>
      </div>
    </form>
  );
}

export default CourseCreateForm;
