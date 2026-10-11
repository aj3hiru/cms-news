import { guardPage } from "@/lib/pageGuard";
import { resolveSiteConfig } from "@/lib/config";
import { indexNowLog } from "@/lib/indexNow";
import { loadSeoSettingsFresh } from "@/lib/seo/settings";
import { RmIndexing } from "@/components/admin/seo/RmTools";

export const dynamic = "force-dynamic";

export default async function SeoIndexingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const denied = await guardPage((p) => p.settings.seo, "Only users with SEO access can use Instant Indexing.");
  if (denied) return denied;
  const [log, cfg, seo, sp] = await Promise.all([indexNowLog(), resolveSiteConfig(""), loadSeoSettingsFresh(), searchParams]);
  return <RmIndexing log={log} keyUrl={`${cfg.siteUrl}/indexnow-key.txt`} moduleOn={seo.m_instant_indexing} initialTab={sp.tab} />;
}
