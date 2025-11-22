"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Question = {
  question: string;
  alternatives: string[];
  correct_index: number;
};

type Props = {
  courseId: string;
};

export function ExamEditorForm({ courseId }: Props) {
  const { toast } = useToast();
  const [notaMinima, setNotaMinima] = useState("7");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/learning/courses/${courseId}/exam`);
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.data) {
          setNotaMinima(String(json.data.nota_minima_aprovacao ?? 7));
          setQuestions(
            (json.data.questions as any[])?.map((q) => ({
              question: q.question,
              alternatives: q.alternatives,
              correct_index: q.correct_index,
            })) ?? []
          );
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { question: "", alternatives: [""], correct_index: 0 }]);
  };

  const updateQuestion = (idx: number, data: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...data } : q)));
  };

  const updateAlternative = (qIdx: number, altIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const alts = [...q.alternatives];
        alts[altIdx] = value;
        return { ...q, alternatives: alts };
      })
    );
  };

  const addAlternative = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, alternatives: [...q.alternatives, ""] } : q))
    );
  };

  const save = () => {
    startTransition(async () => {
      try {
        const payload = {
          courseId,
          nota_minima_aprovacao: Number(notaMinima) || 0,
          questions: questions.map((q, idx) => ({
            question: q.question.trim(),
            alternatives: q.alternatives.map((a) => a.trim()).filter(Boolean),
            correct_index: q.correct_index ?? 0,
            ordem: idx + 1,
          })),
        };
        const res = await fetch(`/api/learning/courses/${courseId}/exam`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Erro ao salvar prova");
        toast({ title: "Prova salva" });
      } catch (err: any) {
        toast({ title: "Erro", description: String(err?.message || err), variant: "destructive" });
      }
    });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando prova...</p>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nota">Nota mínima para aprovação</Label>
        <Input
          id="nota"
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={notaMinima}
          onChange={(e) => setNotaMinima(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pergunta {idx + 1}</Label>
              </div>
              <Textarea
                value={q.question}
                onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                placeholder="Digite a pergunta"
              />
              <div className="space-y-2">
                <Label>Alternativas</Label>
                {q.alternatives.map((alt, aIdx) => (
                  <div key={aIdx} className="flex items-center gap-2">
                    <Input
                      value={alt}
                      onChange={(e) => updateAlternative(idx, aIdx, e.target.value)}
                      placeholder={`Alternativa ${aIdx + 1}`}
                    />
                    <input
                      type="radio"
                      name={`correct-${idx}`}
                      checked={q.correct_index === aIdx}
                      onChange={() => updateQuestion(idx, { correct_index: aIdx })}
                    />
                    <span className="text-xs text-muted-foreground">Correta</span>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addAlternative(idx)}>
                  Adicionar alternativa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button type="button" variant="outline" onClick={addQuestion}>
          Adicionar pergunta
        </Button>
      </div>

      <Button onClick={save} disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar prova"}
      </Button>
    </div>
  );
}

export default ExamEditorForm;
