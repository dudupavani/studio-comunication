"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { CourseModule, Lesson } from "@/lib/learning/types";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";

type Props = {
  courseId: string;
  modules: CourseModule[];
  lessons: Lesson[];
};

export function ContentModules({ courseId, modules, lessons }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [currentModules, setCurrentModules] = useState<CourseModule[]>(modules);

  useEffect(() => {
    setCurrentModules(modules);
  }, [modules]);

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    lessons.forEach((l) => {
      const key = l.module_id || "__no_module";
      const list = map.get(key) || [];
      list.push(l);
      map.set(key, list);
    });
    return map;
  }, [lessons]);

  const createModule = () => {
    if (!title.trim()) {
      toast({ title: "Informe um título" });
      return;
    }
    const submit = async () => {
      try {
        const res = await fetch(`/api/learning/courses/${courseId}/modules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Erro ao criar módulo");
        setCurrentModules((prev) => [...prev, json.data]);
        setTitle("");
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
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:gap-3">
            <Input
              placeholder="Nome do módulo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="md:flex-1"
            />
            <Button type="button" onClick={createModule} disabled={isPending} className="mt-2 md:mt-0">
              {isPending ? "Salvando..." : "Adicionar módulo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        {currentModules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">Nenhum módulo ainda.</CardContent>
          </Card>
        ) : null}
        {currentModules.map((mod) => {
          const moduleLessons = lessonsByModule.get(mod.id) || [];
          return (
            <AccordionItem key={mod.id} value={mod.id} className="border rounded-md">
              <AccordionTrigger className="px-4 py-3 text-left">
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{mod.title}</span>
                  <span className="text-xs text-muted-foreground">{moduleLessons.length} aulas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="flex justify-end">
                  <Button asChild size="sm">
                    <Link href={`/learning/admin/courses/${courseId}/lessons/new?module=${mod.id}`}>
                      + Nova aula
                    </Link>
                  </Button>
                </div>
                <div className="space-y-2">
                  {moduleLessons.map((lesson) => (
                    <div key={lesson.id} className="rounded-md border p-3 bg-white">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground">Ordem: {lesson.ordem}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{lesson.liberada ? "Liberada" : "Bloqueada"}</span>
                          <Button size="sm" asChild variant="outline">
                            <Link
                              href={`/learning/admin/courses/${courseId}/lessons/${lesson.id}?module=${mod.id}`}>
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Link>
                          </Button>
                        </div>
                      </div>
                      {lesson.description ? (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                      ) : null}
                    </div>
                  ))}
                  {moduleLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma aula neste módulo.</p>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

export default ContentModules;
