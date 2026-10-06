import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { resolveSiteConfig } from "@/lib/config";
import { getPushCampaigns, getPushOverview } from "@/lib/push/admin";
import { PushAdmin } from "@/components/admin/push/PushAdmin";

export const dynamic = "force-dynamic";

export default async function PushNotificationsPage() {
  const user = await requireUser();
  if (!user || (user.role !== "admin" && user.role !== "editor")) redirect("/admin/dashboard");
  const [overview, campaigns, cfg] = await Promise.all([getPushOverview(), getPushCampaigns(), resolveSiteConfig("")]);
  return <PushAdmin overview={overview} campaigns={campaigns} isAdmin={user.role === "admin"} siteName={cfg.siteName} />;
}
