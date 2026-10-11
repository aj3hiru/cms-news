import { guardPage } from "@/lib/pageGuard";
import { runSeoAnalyzer } from "@/lib/seo/analyzer";
import { RmAnalyzer } from "@/components/admin/seo/RmTools";

export const dynamic = "force-dynamic";

export default async function SeoAnalyzerPage() {
  const denied = await guardPage((p) => p.settings.seo, "Only users with SEO access can run the SEO Analyzer.");
  if (denied) return denied;
  const r = await runSeoAnalyzer();
  return <RmAnalyzer {...r} />;
}
