import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { postUrl } from "@/lib/urls";

/** Customizer preview → the newest published post. */
export async function GET(request: NextRequest) {
  const post = await prisma.post.findFirst({ where: { status: "published" }, orderBy: { date: "desc" }, select: { slug: true } });
  return NextResponse.redirect(new URL(post ? postUrl(post.slug) : "/", request.url));
}
