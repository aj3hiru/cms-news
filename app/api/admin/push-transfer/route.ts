import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveSiteConfig } from "@/lib/config";
import { getPushSettings, savePushSettings, validateVapidPair } from "@/lib/push/settings";
import { ensurePushSchema } from "@/lib/push/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

/**
 * Push export / import — every key set and every subscriber, so push can move to another site or be restored.
 * Same file as EduMint's (format "edumint-push"), so the two can exchange subscribers.
 *   GET  → JSON download
 *   POST (file) → { ok, keys, added, updated, skipped }
 */
async function adminOnly() {
  const u = await requireUser();
  return u && u.role === "admin" ? u : null;
}

export async function GET() {
  if (!(await adminOnly())) return NextResponse.json({ error: "Only administrators can do this." }, { status: 403 });
  await ensurePushSchema();
  const s = await getPushSettings();
  const cfg = await resolveSiteConfig("");
  const extra = await prisma.pushKey.findMany({ orderBy: { id: "asc" } });
  const pub = new Map<number | null, string>([[null, s.publicKey], ...extra.map((k) => [k.id, k.publicKey] as [number, string])]);
  const keys = [
    ...(s.configured ? [{ public_key: s.publicKey, private_key: s.privateKey, subject: s.subject, active: true }] : []),
    ...extra.map((k) => ({ public_key: k.publicKey, private_key: k.privateKey, subject: k.subject, active: false })),
  ];
  const subscribers: Record<string, unknown>[] = [];
  let lastId = 0;
  for (;;) {
    const rows = await prisma.pushSubscription.findMany({ where: { id: { gt: lastId } }, orderBy: { id: "asc" }, take: 2000 });
    if (!rows.length) break;
    for (const r of rows) {
      subscribers.push({
        subscription: { endpoint: r.endpoint, expirationTime: null, keys: { p256dh: r.p256dh, auth: r.auth } },
        public_key: pub.get(r.keyId ?? null) ?? null,
        device: r.device,
        os: r.os,
        browser: r.browser,
        country: r.country ?? "",
        region: r.region,
        city: r.city,
        lang: r.lang,
        tz: r.tz,
        created_at: r.createdAt.toISOString(),
      });
    }
    lastId = rows[rows.length - 1].id;
  }
  let host = "site";
  try {
    host = new URL(cfg.siteUrl).host;
  } catch {}
  const body = JSON.stringify({ format: "edumint-push", version: 1, site: host, exported_at: new Date().toISOString(), keys, subscribers }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="push-${host.replace(/[^a-z0-9.-]/gi, "")}-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await adminOnly())) return NextResponse.json({ error: "Only administrators can do this." }, { status: 403 });
  let data: { keys?: unknown; subscribers?: unknown };
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Please choose an export file." }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "The file is too large (max 50 MB)." }, { status: 400 });
    data = JSON.parse(await file.text());
  } catch {
    return NextResponse.json({ error: "This file is not valid JSON." }, { status: 400 });
  }
  if (!data || (!Array.isArray(data.keys) && !Array.isArray(data.subscribers))) return NextResponse.json({ error: "This is not a push export file." }, { status: 400 });
  await ensurePushSchema();
  const s = await getPushSettings();
  const keyIds = new Map<string, number | null>();
  const fileKeys: string[] = [];
  let keysAdded = 0;
  let haveCurrent = s.configured;
  for (const k of (data.keys as Record<string, unknown>[]) ?? []) {
    const publicKey = String(k?.public_key ?? k?.publicKey ?? "").trim();
    const privateKey = String(k?.private_key ?? k?.privateKey ?? "").trim();
    if (validateVapidPair(publicKey, privateKey)) continue;
    fileKeys.push(publicKey);
    if (s.configured && publicKey === s.publicKey) {
      keyIds.set(publicKey, null);
      continue;
    }
    if (!haveCurrent) {
      // no key on this site yet: the first key of the file becomes the current one
      await savePushSettings({ publicKey, privateKey, subject: String(k?.subject ?? "") || s.subject });
      keyIds.set(publicKey, null);
      haveCurrent = true;
      keysAdded++;
      continue;
    }
    const row = await prisma.pushKey.upsert({ where: { publicKey }, create: { publicKey, privateKey, subject: String(k?.subject ?? "").slice(0, 255) }, update: {} });
    keyIds.set(publicKey, row.id);
    keysAdded++;
  }
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const item of (data.subscribers as Record<string, unknown>[]) ?? []) {
    const sub = (typeof item?.subscription === "string" ? JSON.parse(item.subscription as string) : item?.subscription) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
    const endpoint = String(sub?.endpoint ?? "");
    const p256dh = String(sub?.keys?.p256dh ?? "");
    const auth = String(sub?.keys?.auth ?? "");
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 768 || !p256dh || !auth) {
      skipped++;
      continue;
    }
    const pk = String(item.public_key ?? (fileKeys.length === 1 ? fileKeys[0] : ""));
    if (!keyIds.has(pk)) {
      skipped++; // without its key nobody can send to it
      continue;
    }
    const keyId = keyIds.get(pk) ?? null;
    const str = (k: string, max: number) => String(item[k] ?? "").trim().slice(0, max);
    const cc = str("country", 2).toUpperCase();
    const created = new Date(String(item.created_at ?? ""));
    const exists = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { id: true } });
    if (exists) {
      await prisma.pushSubscription.update({ where: { id: exists.id }, data: { p256dh, auth, keyId } });
      updated++;
    } else {
      await prisma.pushSubscription.create({
        data: {
          endpoint,
          p256dh,
          auth,
          keyId,
          device: ["mobile", "desktop"].includes(str("device", 20)) ? str("device", 20) : "",
          os: str("os", 30),
          browser: str("browser", 30),
          country: /^[A-Z]{2}$/.test(cc) ? cc : null,
          region: str("region", 80),
          city: str("city", 80),
          lang: str("lang", 20),
          tz: str("tz", 60),
          ...(isNaN(created.getTime()) ? {} : { createdAt: created }),
        },
      });
      added++;
    }
  }
  return NextResponse.json({ ok: true, keys: keysAdded, added, updated, skipped });
}
