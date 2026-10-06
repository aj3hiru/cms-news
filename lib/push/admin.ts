"use server";

import { prisma } from "../db";
import { requireUser } from "../auth";
import { resolveSiteConfig } from "../config";
import { resolveMediaUrl, postUrl } from "../urls";
import { generateVapidKeys, getPushSettings, keyFingerprint, savePushSettings, validateVapidPair, type PushSettings } from "./settings";
import { kickPushQueue, PushSendError, queueCampaign } from "./queue";

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
}

export async function getPushCampaigns(): Promise<CampaignRow[]> {
  await staff();
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
  }));
}

export async function getPushOverview() {
  await staff();
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

export async function sendPushNotification(input: { title: string; body: string; url: string; image: string; postId: number | null; sendAt: string }): Promise<{ ok: boolean; error?: string; total?: number; scheduled?: boolean }> {
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
