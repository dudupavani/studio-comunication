import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import CalendarClient from "@/components/calendar/CalendarClient";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  // Check if calendar feature is enabled
  const isCalendarEnabled = process.env.CALENDAR_ENABLED === "true";

  if (!isCalendarEnabled) {
    // Return a simple "coming soon" message
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Calendário</h1>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Em breve!</h2>
          <p className="text-gray-600">
            Estamos trabalhando para trazer esta funcionalidade para você.
          </p>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const authContext = await getAuthContext(supabase);

  // Redirect if user is not authenticated
  if (!authContext || !authContext.userId) {
    redirect("/login");
  }

  // Redirect if user doesn't have an organization
  if (!authContext.orgId) {
    redirect("/onboarding");
  }

  return (
    <div className="container mx-auto h-full flex flex-col">
      <div className="flex-grow py-4">
        <CalendarClient
          orgId={authContext.orgId}
          unitId={authContext.unitIds?.[0]}
        />
      </div>
    </div>
  );
}
