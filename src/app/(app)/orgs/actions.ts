"use server";

import { redirect } from "next/navigation";
import { createOrg } from "@/lib/actions/orgs";

export type CreateOrgState = { ok?: boolean; error?: string };

export async function createOrgAndGo(
  _prev: CreateOrgState,
  formData: FormData
): Promise<CreateOrgState> {
  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Informe o nome da organização." };

  const res = await createOrg(name);
  if (!res.ok) return { ok: false, error: res.error };

  // Fluxo atual usa /settings; evitamos cair em rota inexistente /orgs/:slug.
  redirect(`/orgs/${res.data.slug}/settings`);
}
