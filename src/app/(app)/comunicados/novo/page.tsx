import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/messages/auth-context";
import { NewAnnouncementForm } from "../components/NewAnnouncementForm";

export default async function NewAnnouncementPage() {
  const auth = await getAuthContext();
  if (!auth) {
    return notFound();
  }
  const canCreate =
    auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;

  if (!canCreate) {
    return notFound();
  }

  return (
    <div className=" space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon-sm">
          <Link href="/comunicados">
            <ArrowLeft />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h3>Novo comunicado</h3>
      </div>
      <NewAnnouncementForm orgId={auth.orgId} />
    </div>
  );
}
