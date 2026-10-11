import { buildTagsSitemap, xmlResponse } from "@/lib/seoFeeds";
import { getSeoSettings } from "@/lib/seo/settings";

export const revalidate = 300;

export async function GET() {
  const xml = (await getSeoSettings()).m_sitemap ? await buildTagsSitemap() : null;
  if (!xml) return new Response("Not found", { status: 404 });
  return xmlResponse(xml);
}
