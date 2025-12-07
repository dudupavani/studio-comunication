"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Props = {
  lessonId: string;
  initial: {
    title: string;
    description: string;
    content_html: string;
    video_url: string;
    liberada: boolean;
  };
};

export function LessonEditorForm({ lessonId, initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [content, setContent] = useState(initial.content_html);
  const [videoUrl, setVideoUrl] = useState(initial.video_url);
  const [liberada, setLiberada] = useState(initial.liberada);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submit = async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          content_html: content.trim() || null,
          video_url: videoUrl.trim() || null,
          liberada,
        };
        const res = await fetch(`/api/learning/lessons/${lessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Erro ao salvar aula");
        toast({ title: "Aula atualizada" });
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
    <form onSubmit={onSubmit} className="space-y-4 max-w-3xl">
      <div className="space-y-2">
        <Label htmlFor="title">Título da aula</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Descrição</Label>
        <Textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Resumo da aula"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="video">Vídeo (YouTube/Vimeo)</Label>
        <Input
          id="video"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtu.be/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo (HTML/Markdown)</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Conteúdo da aula"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch id="liberada" checked={liberada} onCheckedChange={(v) => setLiberada(!!v)} />
        <Label htmlFor="liberada">Aula liberada para alunos</Label>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar aula"}
      </Button>
    </form>
  );
}

export default LessonEditorForm;
