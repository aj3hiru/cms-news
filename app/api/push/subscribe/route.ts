import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getPushClientConfig } from "@/lib/push/settings";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** What the browser needs to subscribe (no secrets). */
export async function GET() {
  return NextResponse.json(await getPushClientConfig(), { headers: { "Cache-Control": "no-store" } });
}

/** Saves (or refreshes) a browser's push subscription. */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit("push_subscribe", 60, 10);
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });
  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const endpoint = String(body.endpoint ?? "");
  const p256dh = String(body.keys?.p256dh ?? "");
  const auth = String(body.keys?.auth ?? "");
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 768 || !p256dh || !auth || p256dh.length > 255 || auth.length > 255) {
    return NextResponse.json({ ok: false, error: "Invalid subscription" }, { status: 400 });
  }
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 255);
  const country = (request.headers.get("cf-ipcountry") ?? "").slice(0, 8) || null;
  await prisma.pushSubscription.upsert({ where: { endpoint }, create: { endpoint, p256dh, auth, userAgent, country }, update: { p256dh, auth, userAgent } });
  return NextResponse.json({ ok: true });
}

/** Removes a subscription (the reader turned notifications off). */
export async function DELETE(request: NextRequest) {
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint) } });
  return NextResponse.json({ ok: true });
}
