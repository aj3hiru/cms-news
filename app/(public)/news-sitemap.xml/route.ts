import { buildNewsSitemap, xmlResponse } from "@/lib/seoFeeds";

export const revalidate = 300;

/** Older address of the Google News sitemap — same content as /sitemap-news.xml. */
export async function GET() {
  return xmlResponse(await buildNewsSitemap());
}
