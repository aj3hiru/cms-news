import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getPushClientConfig, getPushSettings } from "@/lib/push/settings";
import { ensurePushSchema } from "@/lib/push/schema";
import { parseUserAgent } from "@/lib/push/ua";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** What the browser needs to subscribe (no secrets). */
export async function GET() {
  return NextResponse.json(await getPushClientConfig(), { headers: { "Cache-Control": "no-store" } });
}

/** Saves (or refreshes) a browser's push subscription with its device, browser and location. */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit("push_subscribe", 60, 10);
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });
  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; key?: string; tz?: string; lang?: string; touch?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const sub = body.subscription && typeof body.subscription === "object" ? body.subscription : body; // older clients send the bare subscription
  const endpoint = String(sub.endpoint ?? "");
  const p256dh = String(sub.keys?.p256dh ?? "");
  const auth = String(sub.keys?.auth ?? "");
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 768 || !p256dh || !auth || p256dh.length > 255 || auth.length > 255) {
    return NextResponse.json({ ok: false, error: "Invalid subscription" }, { status: 400 });
  }
  await ensurePushSchema();
  // Which key the browser subscribed with: the current one (keyId null) or an imported key set
  const settings = await getPushSettings();
  let keyId: number | null = null;
  if (body.key && body.key !== settings.publicKey) {
    const k = await prisma.pushKey.findUnique({ where: { publicKey: String(body.key) }, select: { id: true } });
    if (!k) return NextResponse.json({ ok: false, error: "Unknown key", key: settings.configured ? settings.publicKey : "" }, { status: 409 });
    keyId = k.id;
  }
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 255);
  const ua = parseUserAgent(userAgent, Boolean(body.touch), endpoint);
  const hdr = (name: string, max: number) => {
    let v = (request.headers.get(name) ?? "").trim();
    if (v.includes("%")) {
      try {
        v = decodeURIComponent(v);
      } catch {}
    }
    return v.replace(/[\x00-\x1f]/g, "").slice(0, max);
  };
  const cc = hdr("cf-ipcountry", 2).toUpperCase();
  const country = /^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1" ? cc : null;
  const region = hdr("cf-region", 80);
  const city = hdr("cf-ipcity", 80);
  const lang = String(body.lang ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 20);
  const tz = String(body.tz ?? "").replace(/[^A-Za-z0-9_/+-]/g, "").slice(0, 60);
  const details = { userAgent, keyId, device: ua.device, os: ua.os, browser: ua.browser || "Other", lang, tz, updatedAt: new Date() };
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, country, region, city, ...details },
    // a visit without location headers keeps what was saved before
    update: { p256dh, auth, ...details, ...(country ? { country } : {}), ...(region ? { region } : {}), ...(city ? { city } : {}) },
  });
  return NextResponse.json({ ok: true });
}

/** Removes a subscription (the reader turned notifications off). */
export async function DELETE(request: NextRequest) {
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint) } });
  return NextResponse.json({ ok: true });
}
