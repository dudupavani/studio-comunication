import { getAuthContext } from "@/lib/messages/auth-context";
import MessagesAnnouncements from "./components/MessagesAnnouncements";

export default async function ComunicadosPage() {
  const auth = await getAuthContext();
  const canCreate =
    auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;

  return (
    <div className="h-full p-4 sm:p-6">
      <MessagesAnnouncements canCreateAnnouncements={canCreate} />
    </div>
  );
}
