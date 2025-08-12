import { listUnitMembers } from "@/lib/actions/unit-members";
import MembersTabClient from "./members-tab.client";

export default async function MembersTabServer(props: {
  orgId: string;
  orgSlug: string;
  unitId: string;
  unitSlug: string;
}) {
  const initialMembers = await listUnitMembers(props.unitId);

  return <MembersTabClient {...props} initialMembers={initialMembers} />;
}
