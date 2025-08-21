export const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  platform_support: "Platform Support",
  org_admin: "Admin",
  org_master: "Master",
  unit_master: "Unid. Master",
  unit_user: "Unid. User",
};

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "-";
  return ROLE_LABELS[role] ?? role;
}