// src/app/(app)/orgs/[orgSlug]/units/[unitSlug]/page.tsx
import { redirect } from "next/navigation";
export default function LegacyUnitDetail({ params }: { params: { unitSlug: string } }) {
  redirect(`/units/${params.unitSlug}`);
}