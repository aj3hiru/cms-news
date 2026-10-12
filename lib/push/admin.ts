"use server";

import { prisma } from "../db";
import { requireUser } from "../auth";
import { getAppConfig, resolveSiteConfig } from "../config";
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

/** One page of the push history (newest first) and how many pages there are. */
export async function getPushCampaignsPage(page = 1): Promise<{ rows: CampaignRow[]; page: number; pages: number }> {
  await staff();
  await ensurePushSchema();
  const pages = Math.max(1, Math.ceil((await prisma.pushCampaign.count()) / 25));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { rows: await getPushCampaigns(p), page: p, pages };
}

export async function getPushCampaigns(page = 1): Promise<CampaignRow[]> {
  await staff();
  await ensurePushSchema();
  const rows = await prisma.pushCampaign.findMany({ orderBy: { id: "desc" }, take: 25, skip: (Math.max(1, Math.floor(page) || 1) - 1) * 25 });
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

export type ArticleMeta = { ok: true; title: string; body: string; image: string; url: string; icon: string; site: string; postId: number | null } | { ok: false; error: string };

/** Shortens text to about `max` characters, ending at a word. */
function shortText(s: string, max = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[\s,;:.–-]+$/, "")}…`;
}

/** The icon a notification shows when none is chosen: the Push settings icon, else the site icon (favicon). Absolute URL or "". */
async function siteIconUrl(): Promise<string> {
  const [s, cfg, app] = await Promise.all([getPushSettings(), resolveSiteConfig(""), getAppConfig()]);
  const raw = s.icon?.trim() || app.site_favicon?.trim() || "";
  if (!raw) return "";
  const u = resolveMediaUrl(raw);
  return /^https?:\/\//.test(u) ? u : `${cfg.siteUrl.replace(/\/+$/, "")}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** GET with every hop checked: public addresses only (also after redirects), 9 s, stops after </head> or 1.5 MB. */
async function safeFetchHead(start: URL): Promise<{ html: string; url: URL } | { error: string }> {
  const { lookup } = await import("dns/promises");
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    if (!/^https?:$/.test(url.protocol)) return { error: "Only http(s) links can be fetched." };
    try {
      const addrs = await lookup(url.hostname, { all: true });
      if (!addrs.length || addrs.some((x) => isPrivateIp(x.address))) return { error: "This address can't be fetched." };
    } catch {
      return { error: "Couldn't find that website." };
    }
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(9000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
        },
      });
    } catch {
      return { error: "Couldn't load that page (timeout or blocked)." };
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok) return { error: `The site answered ${res.status}.` };
    let html = "";
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
    return { html, url };
  }
  return { error: "Too many redirects." };
}

/**
 * LaraPush-style "fetch from URL": title, a short text, the featured image and the site icon of any article —
 * this site's own posts come straight from the database, any other site (WordPress or not) from its page tags.
 */
export async function fetchArticleMeta(rawUrl: string): Promise<ArticleMeta> {
  await staff();
  let url: URL;
  try {
    const t = rawUrl.trim();
    url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return { ok: false, error: "That doesn't look like a web address." };
  }
  const cfg = await resolveSiteConfig("");
  const bare = (h: string) => h.toLowerCase().replace(/^www\./, "");
  let ownHost = "";
  try {
    ownHost = bare(new URL(cfg.siteUrl).host);
  } catch {}

  // This site: read the post itself (no network, never blocked)
  if (ownHost && bare(url.host) === ownHost) {
    const slug = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, "").split("/").pop() ?? "");
    const post = slug
      ? await prisma.post.findFirst({
          where: { slug, status: "published" },
          select: { id: true, title: true, slug: true, content: true, featuredImage: { select: { filePath: true } }, postMeta: { where: { metaKey: { in: ["summary", "description"] } }, select: { metaKey: true, metaValue: true } } },
        })
      : null;
    if (post) {
      const m = Object.fromEntries(post.postMeta.map((x) => [x.metaKey, x.metaValue ?? ""]));
      const text = m.description || m.summary || (post.content ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
      const abs = (u: string) => (!u ? "" : /^https?:\/\//.test(u) ? u : `${cfg.siteUrl.replace(/\/+$/, "")}${u.startsWith("/") ? "" : "/"}${u}`);
      return {
        ok: true,
        title: post.title.slice(0, 200),
        body: shortText(text),
        image: post.featuredImage?.filePath ? abs(resolveMediaUrl(post.featuredImage.filePath)) : "",
        url: postUrl(post.slug),
        icon: await siteIconUrl(),
        site: ownHost,
        postId: post.id,
      };
    }
  }

  const got = await safeFetchHead(url);
  if ("error" in got) return { ok: false, error: got.error };
  const html = got.html;
  const attr = (tag: string, name: string) => new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)?.slice(1).find((v) => v !== undefined) ?? "";
  const meta = (names: string[]) => {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const key = (attr(tag, "property") || attr(tag, "name")).toLowerCase();
      if (names.includes(key)) {
        const c = attr(tag, "content");
        if (c.trim()) return c;
      }
    }
    return "";
  };
  const decode = (s: string) =>
    s
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim();
  const absUrl = (u: string) => {
    try {
      return u ? new URL(decode(u), got.url).toString() : "";
    } catch {
      return "";
    }
  };
  let title = decode(meta(["og:title", "twitter:title"]) || /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || "");
  const siteName = decode(meta(["og:site_name"]));
  // "Post title | Site Name" → "Post title"
  if (siteName && title.length > siteName.length + 10) title = title.replace(new RegExp(`\\s*[|\\-–—:·]\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "").trim();
  if (!title) return { ok: false, error: "No title found on that page." };
  const body = shortText(decode(meta(["og:description", "twitter:description", "description"])));
  const image = absUrl(meta(["og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src"]));
  // Site icon: the largest declared one (apple-touch-icon / icon with sizes), else /favicon.ico
  let icon = "";
  let best = -1;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, "rel").toLowerCase();
    if (!/(^|\s)(icon|apple-touch-icon(-precomposed)?)(\s|$)/.test(rel)) continue;
    const href = absUrl(attr(tag, "href"));
    if (!href || /\.svg(\?|$)/i.test(href)) continue;
    const size = Number(/(\d+)x\d+/.exec(attr(tag, "sizes"))?.[1] ?? (rel.includes("apple") ? 180 : 32));
    if (size > best) {
      best = size;
      icon = href;
    }
  }
  if (!icon) icon = `${got.url.origin}/favicon.ico`;
  return { ok: true, title: shortText(title, 200), body, image, url: absUrl(meta(["og:url"])) || got.url.toString(), icon, site: bare(got.url.host), postId: null };
}

/** The icon used when a notification has none of its own (shown in the Send preview). */
export async function getDefaultPushIcon(): Promise<string> {
  await staff();
  return siteIconUrl();
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
  platform: [string, number][];
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
  const [total, device, os, browser, byCountry, byRegion, byOs] = await Promise.all([
    prisma.pushSubscription.count(),
    group("device"),
    group("os"),
    group("browser"),
    prisma.pushSubscription.groupBy({ by: ["country", "device"], _count: { _all: true } }),
    prisma.pushSubscription.groupBy({ by: ["country", "region", "device"], where: { region: { not: "" } }, _count: { _all: true } }),
    prisma.pushSubscription.groupBy({ by: ["os", "device"], _count: { _all: true } }),
  ]);
  // Android / iOS / desktop — one small circle on Reports
  const pMap = new Map<string, number>();
  for (const r of byOs) {
    const k = r.os === "Android" ? "Android" : r.os === "iOS" ? "iOS (iPhone / iPad)" : ["Windows", "macOS", "Linux", "ChromeOS"].includes(r.os) || r.device === "desktop" ? "Desktop" : "Other";
    pMap.set(k, (pMap.get(k) ?? 0) + r._count._all);
  }
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
    growth, platform: [...pMap.entries()].sort((a, b) => b[1] - a[1]),
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
/** The values your subscribers actually have, with how many each — picked (ticked) in a segment. */
export async function pushFieldCounts(field: string): Promise<{ v: string; l: string; n: number }[]> {
  await staff();
  await ensurePushSchema();
  if (!(field in SEGMENT_FIELDS)) return [];
  const f = field as SegmentField;
  const rows = await prisma.pushSubscription.groupBy({ by: f === "region" ? ["region", "country"] : [f], _count: { _all: true } });
  const out = new Map<string, { v: string; l: string; n: number }>();
  let unknown = 0;
  for (const r of rows) {
    const v = String((r as Record<string, unknown>)[f] ?? "");
    if (!v) {
      unknown += r._count._all;
      continue;
    }
    const cc = String((r as Record<string, unknown>).country ?? "");
    const l = f === "country" ? countryLabel(v) : f === "device" ? v.charAt(0).toUpperCase() + v.slice(1) : f === "region" && cc ? `${v} (${cc})` : v;
    const e = out.get(v) ?? { v, l, n: 0 };
    e.n += r._count._all;
    out.set(v, e);
  }
  const list = [...out.values()].sort((a, b) => b.n - a.n || a.l.localeCompare(b.l)).slice(0, 500);
  if (unknown) list.push({ v: "Unknown", l: "Unknown", n: unknown });
  return list;
}
function countryLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Delivery log of one notification: totals, waiting, and why some failed. */
export async function getPushDeliveryLog(id: number): Promise<
  | { ok: true; total: number; sent: number; failed: number; waiting: number; clicks: number; expired: boolean; url: string; segment: string; created: string; errors: { why: string; n: number }[] }
  | { ok: false; error: string }
> {
  await staff();
  await ensurePushSchema();
  const c = await prisma.pushCampaign.findUnique({ where: { id } });
  if (!c) return { ok: false, error: "Not found." };
  const [waiting, info] = await Promise.all([
    prisma.pushQueue.count({ where: { campaignId: id } }),
    prisma.$queryRawUnsafe<{ f: string | null }[]>("SELECT fail_info AS f FROM push_campaigns WHERE id = ?", id).catch(() => []),
  ]);
  let map: Record<string, number> = {};
  try {
    map = JSON.parse(info[0]?.f || "{}");
  } catch {}
  const label = (k: string) =>
    k === "expired"
      ? "Subscription expired — the reader unsubscribed or cleared the browser (removed automatically)"
      : k === "key"
        ? "Key mismatch — this browser subscribed with another key"
        : k === "timeout"
          ? "The push service did not answer in time"
          : k.replace(/^other:/, "");
  const errors = Object.entries(map)
    .map(([k, n]) => ({ why: label(k), n: Number(n) || 0 }))
    .sort((a, b) => b.n - a.n);
  const untracked = c.failed - errors.reduce((t, e) => t + e.n, 0);
  if (untracked > 0) errors.push({ why: "Failed (sent before reasons were recorded)", n: untracked });
  const live = c.status === "pending" || c.status === "processing";
  return {
    ok: true,
    total: c.totalSubscribers,
    sent: c.sent,
    failed: c.failed,
    waiting,
    clicks: c.clicks,
    expired: live && c.createdAt.getTime() < Date.now() - 86_400_000,
    url: c.url,
    segment: c.segmentName ?? "All subscribers",
    created: c.createdAt.toISOString(),
    errors,
  };
}

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
        icon: (input.icon ? abs(resolveMediaUrl(input.icon)) : await siteIconUrl()) || undefined,
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
