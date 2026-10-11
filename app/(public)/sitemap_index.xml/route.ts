import { buildSitemapIndex, xmlResponse } from "@/lib/seoFeeds";
import { getSeoSettings } from "@/lib/seo/settings";

export const revalidate = 300;

/** Sitemap index (Rank Math layout): post / page / category / post_tag / author / news sitemaps. */
export async function GET() {
  if (!(await getSeoSettings()).m_sitemap) return new Response("Not found", { status: 404 });
  return xmlResponse(await buildSitemapIndex());
}
