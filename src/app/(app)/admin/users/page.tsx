// src/app/(app)/admin/users/page.tsx
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { isPlatformAdmin, isOrgAdmin } from "@/lib/permissions";

export default async function AdminUsersPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const canPlatform = isPlatformAdmin(auth);
  const canOrgAdmin = isOrgAdmin(auth);

  if (!canPlatform && !canOrgAdmin) {
    redirect("/profile");
  }

  // If user has permission, render the actual admin users page content
  // For now, we'll just redirect to the canonical /admin/users path
  // In a real implementation, this would render the user management UI
  // redirect("/users"); // Removed legacy redirect
  return <div>Admin Users Page Content Goes Here</div>; // Placeholder content
}