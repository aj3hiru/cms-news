import { guardPage } from "@/lib/pageGuard";
import { resolveSiteConfig } from "@/lib/config";
import { SeoWizard } from "@/components/admin/seo/SeoWizard";
import { loadSeoSettingsFresh } from "@/lib/seo/settings";

export const dynamic = "force-dynamic";

export default async function SeoWizardPage() {
  const denied = await guardPage((p) => p.settings.seo, "Only users with SEO access can run the setup wizard.");
  if (denied) return denied;
  const [seo, cfg] = await Promise.all([loadSeoSettingsFresh(), resolveSiteConfig("")]);
  return <SeoWizard initial={seo} siteName={cfg.siteName} />;
}
