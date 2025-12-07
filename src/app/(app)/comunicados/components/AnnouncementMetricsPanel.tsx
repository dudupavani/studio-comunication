"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MetricsResponse = {
  totalRecipients: number;
  uniqueViews: number;
  openRate: number;
  likes: {
    total: number;
    likeRate: number;
  };
  viewers: Array<{
    userId: string | null;
    name: string;
    title: string | null;
    avatarUrl: string | null;
    openedAt: string;
    viewCount: number;
  }>;
  likesSeries: {
    day: Array<{ label: string; value: number }>;
    month: Array<{ label: string; value: number }>;
  };
};

interface Props {
  announcementId: string;
}

export function AnnouncementMetricsPanel({ announcementId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [seriesMode, setSeriesMode] = useState<"day" | "month">("day");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/comunicados/${announcementId}/metrics`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? res.statusText);
        }
        return res.json();
      })
      .then((data: MetricsResponse) => {
        if (!active) return;
        setMetrics(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Falha ao carregar métricas.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [announcementId]);

  const chartData = useMemo(() => {
    if (!metrics) return [];
    const list = metrics.likesSeries[seriesMode] ?? [];
    if (list.length) return list;
    if (seriesMode === "day") {
      return Array.from({ length: 24 }, (_, index) => ({
        label: `${String(index).padStart(2, "0")}h`,
        value: 0,
      }));
    }
    return [];
  }, [metrics, seriesMode]);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando métricas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
        <p>{error}</p>
        <Button
          size="sm"
          onClick={() => {
            setLoading(true);
            setError(null);
            setMetrics(null);
            fetch(`/api/comunicados/${announcementId}/metrics`)
              .then(async (res) => {
                if (!res.ok) {
                  const payload = await res.json().catch(() => null);
                  throw new Error(payload?.error ?? res.statusText);
                }
                return res.json();
              })
              .then((data: MetricsResponse) => {
                setMetrics(data);
              })
              .catch((err) => setError(err.message || "Erro ao recarregar."))
              .finally(() => setLoading(false));
          }}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma métrica disponível.
      </div>
    );
  }

  const openRatePercent = formatPercent(metrics.openRate);
  const likePercent = formatPercent(metrics.likes.likeRate);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Taxa de abertura</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{openRatePercent}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.uniqueViews} de {metrics.totalRecipients} destinatários.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Likes registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {metrics.likes.total}
            </p>
            <p className="text-xs text-muted-foreground">
              {likePercent} dos leitores reagiram.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Reações ao longo do tempo
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Quantidade de likes por período
            </p>
          </div>
          <div className="flex gap-2">
            {(["day", "month"] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={seriesMode === mode ? "default" : "outline"}
                onClick={() => setSeriesMode(mode)}>
                {mode === "day" ? "Por hora" : "Por dia"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem likes registrados ainda.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Usuários que visualizaram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {metrics.viewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum usuário abriu este comunicado ainda.
            </p>
          ) : (
            metrics.viewers.map((viewer) => (
              <div
                key={`${viewer.userId ?? "unknown"}-${viewer.openedAt}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={viewer.avatarUrl ?? undefined}
                      alt={viewer.name ?? "Usuário"}
                    />
                    <AvatarFallback>
                      {initialsFromName(viewer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-primary">
                      {viewer.name}
                    </span>
                    {viewer.title ? (
                      <span className="text-xs text-muted-foreground">
                        {viewer.title}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
                  {viewer.viewCount > 1 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {viewer.viewCount}x
                    </span>
                  ) : null}
                  <span>{new Date(viewer.openedAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function initialsFromName(name?: string | null) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
