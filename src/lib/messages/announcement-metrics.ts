"use server";

import { createServerClientReadOnly } from "@/lib/supabase/server";

export type AnnouncementMetrics = {
  totalSent: number;
  totalOpened: number;
  totalViewEvents: number;
  openRate: number;
  hourlyBuckets: Array<{
    label: string;
    count: number;
    rangeStart: number;
    rangeEnd: number;
  }>;
};

const BUCKET_INTERVAL_HOURS = 3;
const BUCKET_COUNT = 24 / BUCKET_INTERVAL_HOURS;

function buildBuckets() {
  return Array.from({ length: BUCKET_COUNT }, (_, index) => {
    const rangeStart = index * BUCKET_INTERVAL_HOURS;
    const rangeEnd = rangeStart + BUCKET_INTERVAL_HOURS;
    const label = `${String(rangeStart).padStart(2, "0")}h - ${String(rangeEnd).padStart(
      2,
      "0"
    )}h`;
    return { label, rangeStart, rangeEnd, count: 0 };
  });
}

type ViewRow = { opened_at: string | null; user_id: string | null };

export async function getAnnouncementMetrics(
  orgId: string
): Promise<AnnouncementMetrics> {
  const supabase = createServerClientReadOnly();
  const totalQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("type", "announcement.sent");
  const readRowsQuery = supabase
    .from("announcement_views")
    .select("user_id, opened_at")
    .eq("org_id", orgId);

  const [
    { count: totalSent, error: totalError },
    { data: readRows, error: readError },
  ] = await Promise.all([totalQuery, readRowsQuery]);

  if (totalError) {
    throw new Error(totalError.message ?? "Falha ao calcular total de destinatários");
  }

  if (readError) {
    throw new Error(readError.message ?? "Falha ao consultar horários de abertura");
  }

  const buckets = buildBuckets();
  const openedRows = (readRows ?? []) as ViewRow[];
  const uniqueUsers = new Set<string>();
  openedRows.forEach((row) => {
    if (row.user_id) uniqueUsers.add(row.user_id);
    if (!row.opened_at) return;
    const date = new Date(row.opened_at);
    if (Number.isNaN(date.getTime())) return;
    const hour = date.getHours();
    const bucketIndex = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor(hour / BUCKET_INTERVAL_HOURS))
    );
    buckets[bucketIndex].count += 1;
  });

  const total = totalSent ?? 0;
  const eventsCount = openedRows.length;
  const openedRecipients = uniqueUsers.size;

  return {
    totalSent: total,
    totalOpened: openedRecipients,
    totalViewEvents: eventsCount,
    openRate: total > 0 ? openedRecipients / total : 0,
    hourlyBuckets: buckets,
  };
}
