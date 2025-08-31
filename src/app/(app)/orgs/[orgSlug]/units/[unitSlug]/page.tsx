// src/app/(app)/orgs/[orgSlug]/units/[unitSlug]/page.tsx
import { redirect } from "next/navigation";
export default async function LegacyUnitDetail({ params }: { params: Promise<{ unitSlug: string }> }) {
  const { unitSlug } = await params;
  redirect(`/units/${unitSlug}`);
}