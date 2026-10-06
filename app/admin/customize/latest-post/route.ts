import { prisma } from "@/lib/db";
import { postUrl } from "@/lib/urls";

/** Customizer preview → the newest published post. A relative Location, so it works behind the proxy. */
export async function GET() {
  const post = await prisma.post.findFirst({ where: { status: "published" }, orderBy: { date: "desc" }, select: { slug: true } });
  return new Response(null, { status: 307, headers: { Location: post ? postUrl(post.slug) : "/", "Cache-Control": "no-store" } });
}
