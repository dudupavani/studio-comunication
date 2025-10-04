// README HELP DESK:
// - /helpdesk: exibe a lista de conversas (Inbox)
// - /helpdesk/[id]: abre a conversa no layout de 3 colunas

import { getAuthContext } from "@/lib/helpdesk/auth-context";
import { HelpdeskInbox } from "./components/HelpdeskInbox";

export default async function HelpdeskPage() {
  await getAuthContext();

  return (
    <div className="h-full p-6">
      <HelpdeskInbox />
    </div>
  );
}
