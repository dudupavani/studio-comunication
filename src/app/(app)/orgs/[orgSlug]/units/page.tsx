// src/app/(app)/orgs/[orgSlug]/units/page.tsx
import { redirect } from "next/navigation";

export default function LegacyUnits() {
  redirect("/units");
}
