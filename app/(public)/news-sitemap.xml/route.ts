import { buildNewsSitemap, xmlResponse } from "@/lib/seoFeeds";
import { getSeoSettings } from "@/lib/seo/settings";

export const revalidate = 300;

/** Older address of the Google News sitemap — same content as /sitemap-news.xml. */
export async function GET() {
  if (!(await getSeoSettings()).news_sitemap) return new Response("Not found", { status: 404 });
  return xmlResponse(await buildNewsSitemap());
}
