import { guardPage } from "@/lib/pageGuard";
import { prisma } from "@/lib/db";
import { resolveSiteConfig } from "@/lib/config";
import { loadSeoSettingsFresh } from "@/lib/seo/settings";
import { sitemapList } from "@/lib/seoFeeds";
import { RmStatus } from "@/components/admin/seo/RmTools";

export const dynamic = "force-dynamic";

export default async function SeoStatusPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const denied = await guardPage((p) => p.settings.seo, "Only users with SEO access can use Status & Tools.");
  if (denied) return denied;
  const [seo, cfg, sp, posts, pages, cats, tags, maps] = await Promise.all([
    loadSeoSettingsFresh(),
    resolveSiteConfig(""),
    searchParams,
    prisma.post.count({ where: { status: "published" } }),
    prisma.page.count({ where: { status: "published" } }),
    prisma.category.count(),
    prisma.tag.count(),
    sitemapList().catch(() => []),
  ]);
  const system: [string, string][] = [
    ["Site address", cfg.siteUrl],
    ["SEO mode", seo.wizard_level === "advanced" ? "Advanced" : "Easy"],
    ["Setup wizard", seo.configured ? "Completed" : "Not completed"],
    ["Search engine visibility", seo.noindex_site ? "Discouraged (noindex)" : "Visible"],
    ["Published posts", String(posts)],
    ["Published pages", String(pages)],
    ["Categories / Tags", `${cats} / ${tags}`],
    ["Sitemaps in the index", seo.m_sitemap ? String(maps.length) : "Sitemap module off"],
    ["News sitemap", seo.news_sitemap ? "On" : "Off"],
    ["Default article schema", seo.default_schema],
    ["Node.js", process.version],
    ["Next.js", (await import("next/package.json")).version],
  ];
  return <RmStatus settings={seo} system={system} initialTab={sp.tab} />;
}
