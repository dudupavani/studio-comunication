// README MESSAGES:
// - /messages: exibe a lista de conversas (Inbox)
// - /messages/[id]: abre a conversa no layout de 3 colunas

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAuthContext } from "@/lib/messages/auth-context";
import { MessagesInbox } from "./components/MessagesInbox";
import MessagesAnnouncements from "./components/MessagesAnnouncements";

export default async function MessagesPage() {
  const auth = await getAuthContext();

  const canCreateConversation =
    auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;

  return (
    <div className="h-full p-6">
      <Tabs defaultValue="conversations" className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="announcements">Comunicados</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="conversations" className="flex-1">
          <MessagesInbox canCreateConversation={canCreateConversation} />
        </TabsContent>

        <TabsContent value="announcements" className="flex-1">
          <MessagesAnnouncements
            canCreateAnnouncements={canCreateConversation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
