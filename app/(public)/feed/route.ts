import { buildRssFeed, xmlResponse } from "@/lib/seoFeeds";

export const revalidate = 300;

/** RSS feed of the latest 100 posts (/rss and /rss.xml move here; Atom at /feed/atom). */
export async function GET() {
  return xmlResponse(await buildRssFeed("/feed"), "application/rss+xml");
}
