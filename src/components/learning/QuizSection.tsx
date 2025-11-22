import { Card, CardContent } from "@/components/ui/card";

export function QuizSection() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2 text-sm text-muted-foreground">
        <p>Quizzes são configurados por aula. Abra um módulo e use o formulário de aula para criar perguntas rápidas.</p>
        <p>Próximos passos: adicionar criador de quiz dedicado aqui, permitindo escolher a aula e cadastrar perguntas/respostas.</p>
      </CardContent>
    </Card>
  );
}

export default QuizSection;
