import { resolveSiteConfig } from "@/lib/config";
import { getSeoSettings } from "@/lib/seo/settings";
import { defaultRobotsRules } from "@/lib/seo/robots";

export const revalidate = 300;

/** robots.txt: the custom text from SEO settings (or the default rules) + the sitemap lines, which always follow the Sitemap modules. */
export async function GET() {
  const [cfg, seo] = await Promise.all([resolveSiteConfig(""), getSeoSettings()]);
  const base = cfg.siteUrl.replace(/\/+$/, "");
  const rules = seo.robots_txt.trim() ? seo.robots_txt.trim().replace(/^\s*sitemap:.*$/gim, "").trim() : defaultRobotsRules();
  const maps = [seo.m_sitemap ? `Sitemap: ${base}/sitemap_index.xml` : "", seo.news_sitemap ? `Sitemap: ${base}/news-sitemap.xml` : ""].filter(Boolean);
  return new Response(`${rules}\n${maps.length ? `\n${maps.join("\n")}\n` : ""}`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300" } });
}
