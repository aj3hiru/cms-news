import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/** Counts a click on a notification (sent by the service worker). */
export async function POST(request: NextRequest) {
  const cid = parseInt(new URL(request.url).searchParams.get("cid") ?? "", 10);
  if (cid > 0) await prisma.pushCampaign.updateMany({ where: { id: cid }, data: { clicks: { increment: 1 } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
