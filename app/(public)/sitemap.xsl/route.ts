import { sitemapXsl } from "@/lib/seoFeeds";

export const revalidate = 3600;

/** Older stylesheet address — the same Rank Math design as /main-sitemap.xsl. */
export async function GET() {
  return new Response(await sitemapXsl(false), { headers: { "Content-Type": "text/xsl; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
