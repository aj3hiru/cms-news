"use server";

import { prisma } from "../db";
import { requireUser } from "../auth";
import { resolveSiteConfig } from "../config";
import { resolveMediaUrl, postUrl } from "../urls";
import { generateVapidKeys, getPushSettings, keyFingerprint, savePushSettings, validateVapidPair, type PushSettings } from "./settings";
import { kickPushQueue, PushSendError, queueCampaign } from "./queue";
import { ensurePushSchema } from "./schema";
import { cleanRules, parseRules, rulesText, rulesToWhere, SEGMENT_FIELDS, type SegmentField } from "./segments";
import webpush from "web-push";

async function staff() {
  const u = await requireUser();
  if (!u || (u.role !== "admin" && u.role !== "editor")) throw new Error("Not allowed.");
  return u;
}
async function admin() {
  const u = await requireUser();
  if (!u || u.role !== "admin") throw new Error("Only admins can change push settings.");
  return u;
}

export interface CampaignRow {
  id: number;
  title: string;
  body: string;
  url: string;
  image: string | null;
  status: string;
  source: string;
  sendAt: string | null;
  createdAt: string;
  total: number;
  sent: number;
  failed: number;
  clicks: number;
  segmentName: string | null;
}

export async function getPushCampaigns(): Promise<CampaignRow[]> {
  await staff();
  await ensurePushSchema();
  const rows = await prisma.pushCampaign.findMany({ orderBy: { id: "desc" }, take: 50 });
  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    body: c.body,
    url: c.url,
    image: c.image,
    status: c.status,
    source: c.source,
    sendAt: c.sendAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    total: c.totalSubscribers,
    sent: c.sent,
    failed: c.failed,
    clicks: c.clicks,
    segmentName: c.segmentName ?? null,
  }));
}

export async function getPushOverview() {
  await staff();
  await ensurePushSchema();
  const s = await getPushSettings();
  const now = Date.now();
  const [total, last7, today, campaigns, clicks] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.pushSubscription.count({ where: { createdAt: { gte: new Date(now - 7 * 86400_000) } } }),
    prisma.pushSubscription.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.pushCampaign.count(),
    prisma.pushCampaign.aggregate({ _sum: { clicks: true, sent: true } }),
  ]);
  return {
    configured: s.configured,
    publicFingerprint: keyFingerprint(s.publicKey),
    privateFingerprint: keyFingerprint(s.privateKey),
    subject: s.subject,
    autoPrompt: s.autoPrompt,
    promptDelay: s.promptDelay,
    showBell: s.showBell,
    autoSendOnPublish: s.autoSendOnPublish,
    icon: s.icon,
    collect: s.collect !== false,
    subscribers: total,
    last7,
    today,
    campaigns,
    totalSent: clicks._sum.sent ?? 0,
    totalClicks: clicks._sum.clicks ?? 0,
  };
}

export async function savePushOptions(patch: Partial<Omit<PushSettings, "publicKey" | "privateKey">>): Promise<{ ok: boolean; error?: string }> {
  await admin();
  const clean: Partial<PushSettings> = {};
  if (typeof patch.subject === "string") clean.subject = patch.subject.trim().slice(0, 200);
  if (typeof patch.autoPrompt === "boolean") clean.autoPrompt = patch.autoPrompt;
  if (typeof patch.showBell === "boolean") clean.showBell = patch.showBell;
  if (typeof patch.autoSendOnPublish === "boolean") clean.autoSendOnPublish = patch.autoSendOnPublish;
  if (patch.promptDelay !== undefined) clean.promptDelay = Math.max(1, Math.min(60, Number(patch.promptDelay) || 3));
  if (typeof patch.icon === "string") clean.icon = patch.icon.trim();
  if (typeof patch.collect === "boolean") clean.collect = patch.collect;
  await savePushSettings(clean);
  return { ok: true };
}

/** New VAPID key pair. Browsers subscribed with the old key re-subscribe on their next visit. */
export async function generatePushKeys(subject: string): Promise<{ ok: boolean; error?: string }> {
  await admin();
  const sub = subject.trim();
  if (!sub) return { ok: false, error: "Enter a contact email (or your site address) first." };
  const keys = generateVapidKeys();
  await savePushSettings({ publicKey: keys.publicKey, privateKey: keys.privateKey, subject: sub });
  return { ok: true };
}

/** Use keys from an older install so existing subscribers keep receiving notifications. */
export async function importPushKeys(publicKey: string, privateKey: string, subject: string): Promise<{ ok: boolean; error?: string }> {
  await admin();
  const err = validateVapidPair(publicKey, privateKey);
  if (err) return { ok: false, error: err };
  if (!subject.trim()) return { ok: false, error: "Enter a contact email." };
  await savePushSettings({ publicKey: publicKey.trim(), privateKey: privateKey.trim(), subject: subject.trim() });
  return { ok: true };
}

export async function sendPushNotification(input: { title: string; body: string; url: string; image: string; postId: number | null; sendAt: string; segmentId?: number | null; icon?: string }): Promise<{ ok: boolean; error?: string; total?: number; scheduled?: boolean }> {
  await staff();
  try {
    const cfg = await resolveSiteConfig("");
    const abs = (u: string) => (!u ? "" : /^https?:\/\//.test(u) ? u : `${cfg.siteUrl}${u.startsWith("/") ? "" : "/"}${u}`);
    const sendAt = input.sendAt ? new Date(input.sendAt) : null;
    const r = await queueCampaign({
      title: input.title,
      body: input.body,
      url: abs(input.url),
      image: input.image ? abs(resolveMediaUrl(input.image)) : null,
      postId: input.postId,
      sendAt: sendAt && !isNaN(sendAt.getTime()) ? sendAt : null,
      segmentId: input.segmentId || null,
      icon: input.icon?.trim() || null,
    });
    kickPushQueue();
    return { ok: true, total: r.totalSubscribers, scheduled: Boolean(sendAt && sendAt.getTime() > Date.now() + 30_000) };
  } catch (e) {
    return { ok: false, error: e instanceof PushSendError || e instanceof Error ? e.message : "Could not send." };
  }
}

export async function deletePushCampaign(id: number): Promise<void> {
  await staff();
  await prisma.pushCampaign.delete({ where: { id } }).catch(() => {});
}

export async function searchPostsForPush(q: string) {
  await staff();
  const posts = await prisma.post.findMany({
    where: { status: "published", ...(q.trim() ? { title: { contains: q.trim() } } : {}) },
    orderBy: { date: "desc" },
    take: 12,
    select: {
      id: true,
      title: true,
      slug: true,
      date: true,
      featuredImage: { select: { filePath: true } },
      postMeta: { where: { metaKey: { in: ["summary", "description"] } }, select: { metaKey: true, metaValue: true } },
    },
  });
  return posts.map((p) => {
    const m = Object.fromEntries(p.postMeta.map((x) => [x.metaKey, x.metaValue ?? ""]));
    return {
      id: p.id,
      title: p.title,
      url: postUrl(p.slug),
      image: p.featuredImage?.filePath ?? "",
      imageSrc: p.featuredImage?.filePath ? resolveMediaUrl(p.featuredImage.filePath) : "",
      body: (m.summary || m.description || "").slice(0, 180),
      date: p.date?.toISOString() ?? null,
    };
  });
}

export async function getPushSubscribers(page: number) {
  await staff();
  const per = 25;
  const [rows, total] = await Promise.all([
    prisma.pushSubscription.findMany({ orderBy: { id: "desc" }, skip: (Math.max(1, page) - 1) * per, take: per }),
    prisma.pushSubscription.count(),
  ]);
  return {
    total,
    pages: Math.max(1, Math.ceil(total / per)),
    rows: rows.map((r) => ({ id: r.id, browser: browserName(r.userAgent ?? "", r.endpoint), country: r.country ?? "", createdAt: r.createdAt.toISOString() })),
  };
}

export async function deletePushSubscriber(id: number): Promise<void> {
  await admin();
  await prisma.pushSubscription.delete({ where: { id } }).catch(() => {});
}

function browserName(ua: string, endpoint: string): string {
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "";
  const b = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : endpoint.includes("mozilla") ? "Firefox" : endpoint.includes("apple") ? "Safari" : "Browser";
  return os ? `${b} · ${os}` : b;
}

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v === "::" || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Reads title / description / image of any public article URL (Open Graph tags first). */
export async function fetchArticleMeta(rawUrl: string): Promise<{ ok: true; title: string; body: string; image: string; url: string } | { ok: false; error: string }> {
  await staff();
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "That doesn't look like a web address." };
  }
  if (!/^https?:$/.test(url.protocol)) return { ok: false, error: "Only http(s) links can be fetched." };
  try {
    const { lookup } = await import("dns/promises");
    const addrs = await lookup(url.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return { ok: false, error: "This address can't be fetched." };
  } catch {
    return { ok: false, error: "Couldn't find that website." };
  }
  let html = "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsCMS-PushPreview/1.0)", Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return { ok: false, error: `The site answered ${res.status}.` };
    const reader = res.body?.getReader();
    if (reader) {
      const dec = new TextDecoder();
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        html += dec.decode(value, { stream: true });
        if (size > 1_500_000 || /<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
    }
  } catch {
    return { ok: false, error: "Couldn't load that page (timeout or blocked)." };
  }
  const meta = (names: string[]) => {
    for (const n of names) {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*>`, "i");
      const tag = re.exec(html)?.[0];
      const content = tag && /content=["']([^"']*)["']/i.exec(tag)?.[1];
      if (content) return content;
    }
    return "";
  };
  const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).trim();
  const title = decode(meta(["og:title", "twitter:title"]) || /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || "");
  const body = decode(meta(["og:description", "twitter:description", "description"]));
  let image = decode(meta(["og:image", "og:image:url", "twitter:image", "twitter:image:src"]));
  if (image) {
    try {
      image = new URL(image, url).toString();
    } catch {
      image = "";
    }
  }
  const canonical = decode(meta(["og:url"])) || url.toString();
  if (!title) return { ok: false, error: "No title found on that page." };
  return { ok: true, title: title.slice(0, 200), body: body.slice(0, 300), image, url: canonical };
}


/* ───────── Push v2: analytics, segments, history, keys, test push (same features as EduMint) ───────── */

export interface PushAnalytics {
  total: number;
  device: [string, number][];
  os: [string, number][];
  browser: [string, number][];
  countries: { code: string; desktop: number; mobile: number; total: number }[];
  regions: { region: string; country: string; desktop: number; mobile: number; total: number }[];
  growth: { d: string; added: number; total: number }[];
}

/** Subscriber numbers: growth, device / OS / browser, countries and states (LaraPush-style). */
export async function getPushAnalytics(days = 30): Promise<PushAnalytics> {
  await staff();
  await ensurePushSchema();
  const span = [7, 30, 90, 365].includes(days) ? days : 30;
  const group = async (field: "device" | "os" | "browser") => {
    const rows = await prisma.pushSubscription.groupBy({ by: [field], _count: { _all: true } });
    return rows.map((r) => [String(r[field] || "Unknown"), r._count._all] as [string, number]).sort((a, b) => b[1] - a[1]);
  };
  const [total, device, os, browser, byCountry, byRegion] = await Promise.all([
    prisma.pushSubscription.count(),
    group("device"),
    group("os"),
    group("browser"),
    prisma.pushSubscription.groupBy({ by: ["country", "device"], _count: { _all: true } }),
    prisma.pushSubscription.groupBy({ by: ["country", "region", "device"], where: { region: { not: "" } }, _count: { _all: true } }),
  ]);
  const cMap = new Map<string, { code: string; desktop: number; mobile: number; total: number }>();
  for (const r of byCountry) {
    const code = r.country || "";
    const e = cMap.get(code) ?? { code, desktop: 0, mobile: 0, total: 0 };
    if (r.device === "desktop") e.desktop += r._count._all;
    if (r.device === "mobile") e.mobile += r._count._all;
    e.total += r._count._all;
    cMap.set(code, e);
  }
  const rMap = new Map<string, { region: string; country: string; desktop: number; mobile: number; total: number }>();
  for (const r of byRegion) {
    const k = `${r.country}|${r.region}`;
    const e = rMap.get(k) ?? { region: r.region, country: r.country || "", desktop: 0, mobile: 0, total: 0 };
    if (r.device === "desktop") e.desktop += r._count._all;
    if (r.device === "mobile") e.mobile += r._count._all;
    e.total += r._count._all;
    rMap.set(k, e);
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (span - 1));
  const recent = await prisma.pushSubscription.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } });
  let running = await prisma.pushSubscription.count({ where: { createdAt: { lt: start } } });
  const perDay = new Map<string, number>();
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  for (const r of recent) perDay.set(key(r.createdAt), (perDay.get(key(r.createdAt)) ?? 0) + 1);
  const growth: PushAnalytics["growth"] = [];
  for (let i = 0; i < span; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const added = perDay.get(key(d)) ?? 0;
    running += added;
    growth.push({ d: key(d), added, total: running });
  }
  return {
    total,
    device,
    os,
    browser,
    countries: [...cMap.values()].sort((a, b) => b.total - a.total),
    regions: [...rMap.values()].sort((a, b) => b.total - a.total).slice(0, 300),
    growth,
  };
}

export interface SegmentRow {
  id: number;
  name: string;
  rules: ReturnType<typeof parseRules>;
  text: string;
  count: number;
}

export async function listPushSegments(): Promise<SegmentRow[]> {
  await staff();
  await ensurePushSchema();
  const segs = await prisma.pushSegment.findMany({ orderBy: { name: "asc" } });
  return Promise.all(
    segs.map(async (g) => {
      const rules = parseRules(g.rules);
      return { id: g.id, name: g.name, rules, text: rulesText(rules), count: await prisma.pushSubscription.count({ where: rulesToWhere(rules) }) };
    })
  );
}

/** "Calculate estimate": how many subscribers match these rules right now. */
export async function estimatePushSegment(rules: unknown): Promise<number> {
  await staff();
  await ensurePushSchema();
  return prisma.pushSubscription.count({ where: rulesToWhere(cleanRules(rules)) });
}

export async function savePushSegment(id: number | null, name: string, rules: unknown): Promise<{ ok: boolean; error?: string; id?: number }> {
  await staff();
  await ensurePushSchema();
  const n = name.trim().slice(0, 120);
  const r = cleanRules(rules);
  if (!n) return { ok: false, error: "Please give the segment a name." };
  if (!r.length) return { ok: false, error: "Add at least one condition with a value." };
  const data = { name: n, rules: JSON.stringify(r) };
  const row = id ? await prisma.pushSegment.update({ where: { id }, data }) : await prisma.pushSegment.create({ data });
  return { ok: true, id: row.id };
}

export async function deletePushSegment(id: number): Promise<void> {
  await staff();
  await prisma.pushSegment.delete({ where: { id } }).catch(() => {});
}

/** Values already seen for a detail (suggestions in the segment builder). */
export async function pushFieldValues(field: string): Promise<string[]> {
  await staff();
  await ensurePushSchema();
  if (!(field in SEGMENT_FIELDS)) return [];
  const f = field as SegmentField;
  const rows = await prisma.pushSubscription.groupBy({ by: [f], _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 60 });
  return rows.map((r) => String(r[f] ?? "")).filter(Boolean);
}

/** Clear the history (notifications still being delivered stay). */
export async function clearPushHistory(): Promise<{ ok: boolean; removed: number }> {
  await admin();
  const r = await prisma.pushCampaign.deleteMany({ where: { status: { notIn: ["pending", "processing", "scheduled"] } } });
  return { ok: true, removed: r.count };
}

/** Reset: a new key, and the old key(s) with every subscriber erased. Readers who allowed notifications re-subscribe on their next visit. */
export async function resetPushKeys(confirm: string, subject: string): Promise<{ ok: boolean; error?: string; removed?: number }> {
  await admin();
  if (confirm !== "RESET") return { ok: false, error: "Type RESET to confirm." };
  const s = await getPushSettings();
  const sub = subject.trim() || s.subject;
  if (!sub) return { ok: false, error: "Enter a contact email (or your site address) first." };
  await ensurePushSchema();
  const removed = await prisma.pushSubscription.count();
  await prisma.$transaction([prisma.pushSubscription.deleteMany({}), prisma.pushKey.deleteMany({})]);
  const keys = generateVapidKeys();
  await savePushSettings({ publicKey: keys.publicKey, privateKey: keys.privateKey, subject: sub });
  return { ok: true, removed };
}

/** Key sets with their subscriber counts (Settings). */
export async function listPushKeySets(): Promise<{ id: number | null; fingerprint: string; subscribers: number; current: boolean }[]> {
  await admin();
  await ensurePushSchema();
  const s = await getPushSettings();
  const out: { id: number | null; fingerprint: string; subscribers: number; current: boolean }[] = [];
  if (s.configured) out.push({ id: null, fingerprint: keyFingerprint(s.publicKey), subscribers: await prisma.pushSubscription.count({ where: { keyId: null } }), current: true });
  for (const k of await prisma.pushKey.findMany({ orderBy: { id: "asc" } })) {
    out.push({ id: k.id, fingerprint: keyFingerprint(k.publicKey), subscribers: await prisma.pushSubscription.count({ where: { keyId: k.id } }), current: false });
  }
  return out;
}

/** Sends one notification right away to one browser (by subscriber id or endpoint). Not saved in the history. */
export async function sendTestPush(input: { title?: string; body?: string; url?: string; image?: string; icon?: string; subscriberId?: number; endpoint?: string }): Promise<{ ok: boolean; error?: string }> {
  await staff();
  await ensurePushSchema();
  const s = await getPushSettings();
  if (!s.configured) return { ok: false, error: "Push keys aren't set up yet." };
  const sub = input.subscriberId
    ? await prisma.pushSubscription.findUnique({ where: { id: input.subscriberId } })
    : input.endpoint
      ? await prisma.pushSubscription.findUnique({ where: { endpoint: input.endpoint } })
      : null;
  if (!sub) return { ok: false, error: "This browser is not subscribed yet." };
  const key = sub.keyId ? await prisma.pushKey.findUnique({ where: { id: sub.keyId } }) : null;
  const cfg = await resolveSiteConfig("");
  const abs = (u: string) => (!u ? "" : /^https?:\/\//.test(u) ? u : `${cfg.siteUrl}${u.startsWith("/") ? "" : "/"}${u}`);
  const subject = key?.subject || s.subject;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: (input.title || "Test notification").slice(0, 200),
        body: (input.body || `Push notifications are working on ${cfg.siteName}.`).slice(0, 500),
        url: abs(input.url || "/"),
        image: input.image ? abs(resolveMediaUrl(input.image)) : undefined,
        icon: abs(resolveMediaUrl(input.icon || s.icon || "")) || undefined,
        tag: `test-${Date.now()}`,
      }),
      {
        TTL: 3600,
        timeout: 15_000,
        vapidDetails: {
          subject: subject.startsWith("mailto:") || subject.startsWith("https://") ? subject : `mailto:${subject}`,
          publicKey: key?.publicKey ?? s.publicKey,
          privateKey: key?.privateKey ?? s.privateKey,
        },
      }
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Not delivered: ${e instanceof Error ? e.message : "error"}` };
  }
}
