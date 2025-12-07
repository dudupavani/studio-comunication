import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/messages/auth-context";
import { getAnnouncementMetrics } from "@/lib/messages/announcement-metrics";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/info-tooltip";
import { HourlyOpensChart } from "../components/HourlyOpensChart";

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default async function AnnouncementMetricsPage() {
  const auth = await getAuthContext();
  const canViewMetrics = auth.isPlatformAdmin || auth.isOrgAdmin;

  if (!canViewMetrics) {
    redirect("/comunicados");
  }

  const metrics = await getAnnouncementMetrics(auth.orgId);
  const peakBucket =
    metrics.hourlyBuckets.reduce(
      (acc, bucket) => (bucket.count > acc.count ? bucket : acc),
      metrics.hourlyBuckets[0] ?? {
        label: "",
        count: 0,
        rangeStart: 0,
        rangeEnd: 0,
      }
    ) ?? null;

  const hourlyChartData = metrics.hourlyBuckets.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
  }));

  return (
    <div className="h-full space-y-6 p-4 pb-12 sm:p-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/comunicados">
            <ArrowLeft />
          </Link>
        </Button>
        <h2 className="text-xl md:text-auto">Métricas de comunicados</h2>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-4">
                <CardDescription>Taxa de abertura</CardDescription>
                <CardTitle className="text-4xl text-normal">
                  {metrics.totalSent > 0
                    ? formatPercent(metrics.openRate)
                    : "—"}
                </CardTitle>
              </div>
              <InfoTooltip message="Percentual de destinatários que realmente abriram os comunicados enviados." />
            </div>
          </CardHeader>
          {metrics.totalSent === 0 ? (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Envie comunicados para começar a medir as aberturas.
              </p>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-4">
                <CardDescription>Total de destinatários</CardDescription>
                <CardTitle className="text-4xl text-normal">
                  {formatNumber(metrics.totalSent)}
                </CardTitle>
              </div>
              <InfoTooltip message="Contagem acumulada de usuários que receberam comunicados neste ambiente." />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-4">
                <CardDescription>Visualizações registradas</CardDescription>
                <CardTitle className="text-4xl text-normal">
                  {formatNumber(metrics.totalViewEvents)}
                </CardTitle>
              </div>
              <InfoTooltip message="Soma de aberturas de comunicados (pode contar o mesmo usuário mais de uma vez)." />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Usuários únicos: {formatNumber(metrics.totalOpened)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Horários com mais aberturas</CardTitle>
          {peakBucket ? (
            <CardDescription className="flex items-center gap-1">
              Melhor período
              <Badge variant="violet">
                {peakBucket.label} ({formatNumber(peakBucket.count)} aberturas)
              </Badge>
            </CardDescription>
          ) : (
            <CardDescription>
              Aguardando aberturas para exibir distribuição.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {metrics.totalOpened === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não registramos leituras de comunicados para este ambiente.
            </p>
          ) : (
            <HourlyOpensChart data={hourlyChartData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
