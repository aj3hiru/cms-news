import { buildNewsSitemap, xmlResponse } from "@/lib/seoFeeds";
import { getSeoSettings } from "@/lib/seo/settings";

export const revalidate = 300;

/** Google News sitemap (Rank Math format) — News Sitemap module in SEO → Dashboard. */
export async function GET() {
  if (!(await getSeoSettings()).news_sitemap) return new Response("Not found", { status: 404 });
  return xmlResponse(await buildNewsSitemap());
}
