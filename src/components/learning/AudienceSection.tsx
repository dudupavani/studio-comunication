import { Card, CardContent } from "@/components/ui/card";

export function AudienceSection() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2 text-sm text-muted-foreground">
        <p>Segmentação de público (grupos e usuários) será configurada aqui.</p>
        <p>
          Próximo passo: adicionar associação curso → grupos/usuários com busca e toggle de inclusão, respeitando a org/unidade.
        </p>
      </CardContent>
    </Card>
  );
}

export default AudienceSection;
