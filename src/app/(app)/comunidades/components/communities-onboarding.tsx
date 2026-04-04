import {
  Bell,
  MessageCircle,
  Rocket,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CommunitiesOnboardingProps = {
  canManage: boolean;
  onOpenCreateDialog: () => void;
};

const steps = [
  {
    icon: Users,
    title: "Crie sua primeira comunidade",
    description:
      "Organize pessoas em torno de interesses, unidades ou objetivos comuns.",
  },
  {
    icon: MessageCircle,
    title: "Publique conteúdos e eventos",
    description:
      "Comunidades possuem espaços para publicações e eventos separados.",
  },
  {
    icon: Bell,
    title: "Engaje sua equipe",
    description:
      "Mantenha todos informados e participando ativamente das discussões.",
  },
];

export default function CommunitiesOnboarding({
  canManage,
  onOpenCreateDialog,
}: CommunitiesOnboardingProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h1 className="mb-2">Bem-vindo às Comunidades</h1>

        <p className="mb-8 text-base text-muted-foreground">
          Comunidades ajudam a organizar pessoas e conteúdos. Comece criando sua
          primeira comunidade para conectar sua equipe.
        </p>

        {canManage ? (
          <Button size="lg" onClick={onOpenCreateDialog}>
            <Rocket />
            Criar minha primeira comunidade
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Entre em contato com um administrador para criar uma comunidade.
          </p>
        )}
      </div>

      <div className="mt-16 grid w-full max-w-3xl gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={index} className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <step.icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
