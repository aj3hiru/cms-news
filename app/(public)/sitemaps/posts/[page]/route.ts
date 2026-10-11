import { notFound, permanentRedirect } from "next/navigation";
import { buildPostsSitemap, xmlResponse } from "@/lib/seoFeeds";
import { getSeoSettings } from "@/lib/seo/settings";

export const revalidate = 300;

/** /post-sitemap2.xml, /post-sitemap3.xml … (rewrite in next.config.ts). The older /sitemap-posts-N.xml addresses
 *  arrive here with ?legacy=1 and are moved to the new name. */
export async function GET(req: Request, { params }: { params: Promise<{ page: string }> }) {
  const page = parseInt((await params).page, 10);
  if (!page || page < 1) notFound();
  if (new URL(req.url).searchParams.has("legacy")) permanentRedirect(`/post-sitemap${page > 1 ? page : ""}.xml`);
  if (page === 1) permanentRedirect("/post-sitemap.xml");
  const xml = (await getSeoSettings()).m_sitemap ? await buildPostsSitemap(page) : null;
  if (!xml) notFound();
  return xmlResponse(xml);
}
