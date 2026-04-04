// src/lib/calendar/useCalendarEvents.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CalendarEventDTO,
  CalendarQueryParams,
} from "@/lib/calendar/types";

/** Converte Date | string ISO para string ISO segura */
function toISO(input: Date | string): string {
  if (input instanceof Date) return input.toISOString();
  // Se já for ISO, retorna. Se vier vazio, delega erro ao server.
  return input;
}

/** Gera querystring para GET /api/calendar/events */
function buildQuery(params: CalendarQueryParams) {
  const q = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  if (params.orgId) q.set("orgId", params.orgId);
  if (params.unitId) q.set("unitId", params.unitId);
  return q.toString();
}

export type UseCalendarEventsParams = {
  from: Date | string;
  to: Date | string;
  orgId?: string;
  unitId?: string;
};

export type UseCalendarEventsState = {
  data: CalendarEventDTO[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useCalendarEvents({
  from,
  to,
  orgId,
  unitId,
}: UseCalendarEventsParams): UseCalendarEventsState {
  const [data, setData] = useState<CalendarEventDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 🔁 Gatilho de refetch sem usar ref.current no array de deps
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = () => setRefreshKey((k) => k + 1);

  const qs = useMemo(
    () =>
      buildQuery({
        from: toISO(from),
        to: toISO(to),
        orgId,
        unitId,
      }),
    [from, to, orgId, unitId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/calendar/events?${qs}`, {
      signal: controller.signal,
      credentials: "include",
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = json?.error || `HTTP ${r.status}`;
          throw new Error(msg);
        }
        return (json?.data ?? []) as CalendarEventDTO[];
      })
      .then((rows) => {
        setData(rows);
      })
      .catch((e: any) => {
        if (controller.signal.aborted) return;
        setError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [qs, refreshKey]); // ✅ depende do refreshKey (state), não de ref.current

  return { data, loading, error, refetch };
}
