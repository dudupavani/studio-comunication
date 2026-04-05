import { redirect } from "next/navigation";

export default async function LegacyOrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/orgs/${orgSlug}/settings`);
}
