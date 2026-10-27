import { getSitePolicies } from "@/lib/site-policies";
import PoliciesManagementClient from "./PoliciesManagementClient";

export default async function PoliciesPage() {
  const policies = await getSitePolicies();
  return <PoliciesManagementClient initialPolicies={policies} />;
}
