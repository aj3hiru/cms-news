import { guardPage } from "@/lib/pageGuard";
import { loadSeoSettingsFresh } from "@/lib/seo/settings";
import { RmDashboard } from "@/components/admin/seo/RmDashboard";

export const dynamic = "force-dynamic";

/** SEO → Dashboard (Rank Math modules). */
export default async function SeoDashboardPage() {
  const denied = await guardPage((p) => p.settings.seo, "Only users with SEO access can change these settings.");
  if (denied) return denied;
  return <RmDashboard initial={await loadSeoSettingsFresh()} />;
}
