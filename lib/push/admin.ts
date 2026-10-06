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
