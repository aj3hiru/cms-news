import webpush from "web-push";
import { prisma } from "../db";
import { getPushSettings } from "./settings";
import { resolveSiteConfig } from "../config";
import { resolveMediaUrl } from "../urls";

export interface ComposeInput {
  title: string;
  body: string;
  url: string;
  image: string | null;
  postId: number | null;
  /** Send later (scheduled). */
  sendAt?: Date | null;
  source?: "manual" | "auto" | "bulk";
}

export class PushSendError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Creates a campaign and queues one row per subscriber (or schedules it for later). */
export async function queueCampaign(input: ComposeInput): Promise<{ campaignId: number; totalSubscribers: number }> {
  if (!input.title.trim() || !input.url.trim()) throw new PushSendError("Title and link are required.");
  const settings = await getPushSettings();
  if (!settings.configured) throw new PushSendError("Push notifications aren't set up yet — generate the keys in the Settings tab first.");
  const total = await prisma.pushSubscription.count();
  if (total === 0) throw new PushSendError("There are no subscribers yet.", 409);

  const scheduled = input.sendAt && input.sendAt.getTime() > Date.now() + 30_000;
  const campaign = await prisma.pushCampaign.create({
    data: {
      postId: input.postId,
      title: input.title.trim().slice(0, 200),
      body: input.body.trim().slice(0, 1000),
      url: input.url.trim().slice(0, 500),
      image: input.image?.slice(0, 500) || null,
      status: scheduled ? "scheduled" : "pending",
      sendAt: scheduled ? input.sendAt : null,
      totalSubscribers: total,
      source: input.source ?? "manual",
    },
  });
  if (!scheduled) await fillQueue(campaign.id);
  return { campaignId: campaign.id, totalSubscribers: total };
}

/** Queue rows for every current subscriber. */
async function fillQueue(campaignId: number): Promise<void> {
  let lastId = 0;
  let count = 0;
  for (;;) {
    const subs = await prisma.pushSubscription.findMany({ where: { id: { gt: lastId } }, orderBy: { id: "asc" }, take: 1000, select: { id: true } });
    if (!subs.length) break;
    await prisma.pushQueue.createMany({ data: subs.map((s) => ({ campaignId, subscriptionId: s.id })) });
    lastId = subs[subs.length - 1].id;
    count += subs.length;
  }
  await prisma.pushCampaign.update({ where: { id: campaignId }, data: { totalSubscribers: count, status: count ? "pending" : "completed" } });
}

/** Scheduled campaigns whose time has come → queued. Called every minute by the cron. */
export async function releaseScheduledCampaigns(): Promise<number> {
  const due = await prisma.pushCampaign.findMany({ where: { status: "scheduled", sendAt: { lte: new Date() } }, select: { id: true } });
  for (const c of due) {
    await prisma.pushCampaign.update({ where: { id: c.id }, data: { status: "pending" } });
    await fillQueue(c.id);
  }
  if (due.length) kickPushQueue();
  return due.length;
}

const BATCH = 300;
const MAX_ATTEMPTS = 3;
const CONCURRENCY = 10;
const SEND_TIMEOUT_MS = 15_000;
const LOCK_KEY = "push_queue_lock";
const LOCK_TTL_MS = 60_000;

async function processBatch(renew: () => Promise<boolean>): Promise<{ processed: number; campaignId: number | null }> {
  const settings = await getPushSettings();
  if (!settings.configured) return { processed: 0, campaignId: null };
  webpush.setVapidDetails(settings.subject.startsWith("mailto:") || settings.subject.startsWith("https://") ? settings.subject : `mailto:${settings.subject}`, settings.publicKey, settings.privateKey);

  const campaign = await prisma.pushCampaign.findFirst({ where: { status: { in: ["pending", "processing"] } }, orderBy: { id: "asc" } });
  if (!campaign) return { processed: 0, campaignId: null };
  if (campaign.status === "pending") await prisma.pushCampaign.update({ where: { id: campaign.id }, data: { status: "processing" } });

  const rows = await prisma.pushQueue.findMany({ where: { campaignId: campaign.id }, orderBy: { id: "asc" }, take: BATCH, include: { subscription: true } });
  if (!rows.length) {
    await prisma.pushCampaign.update({ where: { id: campaign.id }, data: { status: "completed" } });
    return { processed: 0, campaignId: campaign.id };
  }

  let icon: string | undefined;
  if (settings.icon) {
    const u = resolveMediaUrl(settings.icon);
    icon = /^https?:\/\//.test(u) ? u : `${(await resolveSiteConfig("")).siteUrl}${u}`;
  }
  const payload = JSON.stringify({
    title: campaign.title,
    body: campaign.body,
    image: campaign.image,
    icon,
    url: campaign.url,
    cid: campaign.id,
  });
  const done: number[] = [];
  const deadSubs: number[] = [];
  const retries: { id: number; attempts: number; lastError: string }[] = [];
  let sent = 0;
  let failed = 0;

  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
      while (next < rows.length) {
        const row = rows[next++];
        const sub = row.subscription;
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 86400, timeout: SEND_TIMEOUT_MS });
          done.push(row.id);
          sent++;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            // The browser unsubscribed — forget it.
            deadSubs.push(sub.id);
            done.push(row.id);
            failed++;
          } else if (row.attempts + 1 >= MAX_ATTEMPTS) {
            done.push(row.id);
            failed++;
          } else {
            retries.push({ id: row.id, attempts: row.attempts + 1, lastError: (err instanceof Error ? err.message : "error").slice(0, 500) });
          }
        }
      }
    })
  );

  await prisma.$transaction([
    ...retries.map((r) => prisma.pushQueue.update({ where: { id: r.id }, data: { attempts: r.attempts, lastError: r.lastError } })),
    prisma.pushQueue.deleteMany({ where: { id: { in: done } } }),
    prisma.pushSubscription.deleteMany({ where: { id: { in: deadSubs } } }),
    prisma.pushCampaign.update({ where: { id: campaign.id }, data: { sent: { increment: sent }, failed: { increment: failed } } }),
  ]);
  await renew();
  const left = await prisma.pushQueue.count({ where: { campaignId: campaign.id } });
  if (!left) await prisma.pushCampaign.update({ where: { id: campaign.id }, data: { status: "completed" } });
  return { processed: rows.length, campaignId: campaign.id };
}

/* One worker per server; a lease in app_config stops two processes sending the same rows. */
type WorkerState = { running: boolean; again: boolean; owner: string };
const g = globalThis as unknown as { __nbPush?: WorkerState };
const worker: WorkerState = (g.__nbPush ??= { running: false, again: false, owner: `${process.pid}-${Math.random().toString(36).slice(2, 8)}` });
const lease = (until: number) => `${String(until).padStart(15, "0")}:${worker.owner}`;

async function acquire(): Promise<boolean> {
  await prisma.appConfig.upsert({ where: { configKey: LOCK_KEY }, create: { configKey: LOCK_KEY, configValue: "" }, update: {} }).catch(() => {});
  const r = await prisma.appConfig.updateMany({
    where: { configKey: LOCK_KEY, OR: [{ configValue: "" }, { configValue: null }, { configValue: { lt: lease(Date.now()) } }, { configValue: { endsWith: `:${worker.owner}` } }] },
    data: { configValue: lease(Date.now() + LOCK_TTL_MS) },
  });
  return r.count === 1;
}
async function renew(): Promise<boolean> {
  const r = await prisma.appConfig.updateMany({ where: { configKey: LOCK_KEY, configValue: { endsWith: `:${worker.owner}` } }, data: { configValue: lease(Date.now() + LOCK_TTL_MS) } });
  return r.count === 1;
}
async function release(): Promise<void> {
  await prisma.appConfig.updateMany({ where: { configKey: LOCK_KEY, configValue: { endsWith: `:${worker.owner}` } }, data: { configValue: "" } }).catch(() => {});
}

async function run(): Promise<void> {
  if (!(await acquire())) return;
  let errors = 0;
  try {
    for (;;) {
      worker.again = false;
      try {
        const { campaignId } = await processBatch(renew);
        errors = 0;
        if (campaignId === null) break;
      } catch (e) {
        console.error("[push] batch failed:", e instanceof Error ? e.message : e);
        if (++errors >= 5) break;
        await new Promise((r) => setTimeout(r, 5000 * errors));
      }
      if (!(await renew())) break;
    }
  } finally {
    await release();
  }
}

/** Starts sending in the background (no-op if this server is already sending). */
export function kickPushQueue(): void {
  if (worker.running) {
    worker.again = true;
    return;
  }
  worker.running = true;
  void (async () => {
    try {
      do {
        worker.again = false;
        await run();
      } while (worker.again);
    } catch (e) {
      console.error("[push] worker stopped:", e instanceof Error ? e.message : e);
    } finally {
      worker.running = false;
    }
  })();
}
