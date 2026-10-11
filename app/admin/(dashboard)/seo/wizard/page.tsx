import { guardPage } from "@/lib/pageGuard";
import { resolveSiteConfig } from "@/lib/config";
import { loadSeoSettingsFresh } from "@/lib/seo/settings";
import { RmWizard } from "@/components/admin/seo/RmWizard";

export const dynamic = "force-dynamic";

/** SEO → Setup Wizard (Rank Math steps). */
export default async function SeoWizardPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const denied = await guardPage((p) => p.settings.seo, "Only users with SEO access can run the setup wizard.");
  if (denied) return denied;
  const [seo, cfg, sp] = await Promise.all([loadSeoSettingsFresh(), resolveSiteConfig(""), searchParams]);
  return <RmWizard initial={seo} siteName={cfg.siteName} siteUrl={cfg.siteUrl} initialStep={sp.step} />;
}
