import { buildAtomFeed, xmlResponse } from "@/lib/seoFeeds";

export const revalidate = 300;

/** Atom feed (as WordPress's /feed/atom/). */
export async function GET() {
  return xmlResponse(await buildAtomFeed(), "application/atom+xml");
}
