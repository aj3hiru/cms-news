import { sitemapXsl } from "@/lib/seoFeeds";

export const revalidate = 3600;

export async function GET() {
  return new Response(await sitemapXsl(true), { headers: { "Content-Type": "text/xsl; charset=utf-8", "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex, follow" } });
}
