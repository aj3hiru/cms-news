import { guardPage } from "@/lib/pageGuard";
import { resolveSiteConfig } from "@/lib/config";
import { loadSeoSettingsFresh } from "@/lib/seo/settings";
import { RmSettings } from "@/components/admin/seo/RmSettings";
import { defaultRobotsRules } from "@/lib/seo/robots";

export const dynamic = "force-dynamic";

export default async function SeoScreenPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const denied = await guardPage((p) => p.settings.seo, "Only users with SEO access can change these settings.");
  if (denied) return denied;
  const [seo, cfg, sp] = await Promise.all([loadSeoSettingsFresh(), resolveSiteConfig(""), searchParams]);
  return <RmSettings key={sp.tab ?? ""} screen="general" initial={seo} siteName={cfg.siteName} siteUrl={cfg.siteUrl} initialTab={sp.tab} robotsDefault={defaultRobotsRules()} />;
}
