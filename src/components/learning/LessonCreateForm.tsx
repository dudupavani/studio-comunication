"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Props = {
  courseId: string;
  moduleId?: string;
};

export function LessonCreateForm({ courseId, moduleId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          content_html: content.trim() || null,
          video_url: videoUrl.trim() || null,
          liberada: true,
          module_id: moduleId ?? null,
        };

        const res = await fetch(`/api/learning/courses/${courseId}/lessons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Falha ao criar aula");

        toast({ title: "Aula criada", description: payload.title });
        setTitle("");
        setDescription("");
        setVideoUrl("");
        setContent("");
        router.refresh();
      } catch (err: any) {
        toast({ title: "Erro", description: String(err?.message || err), variant: "destructive" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="lesson-title">Título da aula *</Label>
        <Input
          id="lesson-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Ex.: Introdução"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lesson-desc">Descrição</Label>
        <Textarea
          id="lesson-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Resumo rápido"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lesson-video">Vídeo (YouTube/Vimeo)</Label>
        <Input
          id="lesson-video"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtu.be/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lesson-content">Conteúdo (HTML/Markdown)</Label>
        <Textarea
          id="lesson-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Cole o conteúdo da aula"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Adicionar aula"}
      </Button>
    </form>
  );
}

export default LessonCreateForm;
