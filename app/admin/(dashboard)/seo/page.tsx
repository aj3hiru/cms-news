import { guardPage } from "@/lib/pageGuard";
import { resolveSiteConfig } from "@/lib/config";
import { loadSeoSettingsFresh } from "@/lib/seo/settings";
import { SeoAdmin } from "@/components/admin/seo/SeoAdmin";

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const denied = await guardPage((p) => p.settings.seo, "Only users with SEO access can change these settings.");
  if (denied) return denied;
  const [seo, cfg] = await Promise.all([loadSeoSettingsFresh(), resolveSiteConfig("")]);
  return <SeoAdmin initial={seo} siteName={cfg.siteName} siteUrl={cfg.siteUrl} />;
}
