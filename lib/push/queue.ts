import webpush from "web-push";
import { prisma } from "../db";
import { getPushSettings } from "./settings";
import { getAppConfig, resolveSiteConfig } from "../config";
import { resolveMediaUrl } from "../urls";
import { ensurePushSchema } from "./schema";
import { parseRules, rulesToWhere } from "./segments";

export interface ComposeInput {
  title: string;
  body: string;
  url: string;
  image: string | null;
  postId: number | null;
  /** Send later (scheduled). */
  sendAt?: Date | null;
  source?: "manual" | "auto" | "bulk";
  /** Only the subscribers of this segment (null = everyone). */
  segmentId?: number | null;
  /** Small icon for this notification (media path or URL); empty = Settings icon. */
  icon?: string | null;
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
  await ensurePushSchema();
  let segmentName: string | null = null;
  let where = {};
  if (input.segmentId) {
    const seg = await prisma.pushSegment.findUnique({ where: { id: input.segmentId } });
    if (!seg) throw new PushSendError("That segment no longer exists.");
    segmentName = seg.name;
    where = rulesToWhere(parseRules(seg.rules));
  }
  const total = await prisma.pushSubscription.count({ where });
  if (total === 0) throw new PushSendError(input.segmentId ? "Nobody matches this segment right now." : "There are no subscribers yet.", 409);

  if (input.url.trim().length > 500) throw new PushSendError("The link is too long (max 500 characters).", 400);
  // a cut-off address would be broken: a too-long image / icon is left out instead
  const fit = (u?: string | null) => (u && u.length <= 500 ? u : null);
  const scheduled = input.sendAt && input.sendAt.getTime() > Date.now() + 30_000;
  const campaign = await prisma.pushCampaign.create({
    data: {
      postId: input.postId,
      title: input.title.trim().slice(0, 200),
      body: input.body.trim().slice(0, 1000),
      url: input.url.trim(),
      image: fit(input.image),
      status: scheduled ? "scheduled" : "pending",
      sendAt: scheduled ? input.sendAt : null,
      totalSubscribers: total,
      source: input.source ?? "manual",
      segmentId: input.segmentId ?? null,
      segmentName,
      icon: fit(input.icon?.trim()),
    },
  });
  if (!scheduled) await fillQueue(campaign.id);
  return { campaignId: campaign.id, totalSubscribers: total };
}

/** Queue rows for every current subscriber (of the campaign's segment). Segments are dynamic: whoever matches now. */
async function fillQueue(campaignId: number): Promise<void> {
  const c = await prisma.pushCampaign.findUnique({ where: { id: campaignId }, select: { segmentId: true } });
  let where = {};
  if (c?.segmentId) {
    const seg = await prisma.pushSegment.findUnique({ where: { id: c.segmentId } });
    where = seg ? rulesToWhere(parseRules(seg.rules)) : { id: -1 }; // segment deleted meanwhile: nobody
  }
  let lastId = 0;
  let count = 0;
  for (;;) {
    const subs = await prisma.pushSubscription.findMany({ where: { AND: [where, { id: { gt: lastId } }] }, orderBy: { id: "asc" }, take: 1000, select: { id: true } });
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
  await ensurePushSchema();
  const subjectOf = (s: string) => (s.startsWith("mailto:") || s.startsWith("https://") ? s : `mailto:${s || settings.subject}`);
  // Each subscriber is sent with the key it subscribed with: the current key, or an imported key set
  const vapid = new Map<number | null, { subject: string; publicKey: string; privateKey: string }>();
  vapid.set(null, { subject: subjectOf(settings.subject), publicKey: settings.publicKey, privateKey: settings.privateKey });
  for (const k of await prisma.pushKey.findMany()) vapid.set(k.id, { subject: subjectOf(k.subject), publicKey: k.publicKey, privateKey: k.privateKey });

  const campaign = await prisma.pushCampaign.findFirst({ where: { status: { in: ["pending", "processing"] } }, orderBy: { id: "asc" } });
  if (!campaign) return { processed: 0, campaignId: null };
  if (campaign.status === "pending") await prisma.pushCampaign.update({ where: { id: campaign.id }, data: { status: "processing" } });

  const rows = await prisma.pushQueue.findMany({ where: { campaignId: campaign.id }, orderBy: { id: "asc" }, take: BATCH, include: { subscription: true } });
  if (!rows.length) {
    await prisma.pushCampaign.update({ where: { id: campaign.id }, data: { status: "completed" } });
    return { processed: 0, campaignId: campaign.id };
  }

  let icon: string | undefined;
  // no icon chosen: the Push settings icon, else the site icon (favicon)
  const iconSrc = campaign.icon || settings.icon || (await getAppConfig()).site_favicon?.trim() || "";
  if (iconSrc) {
    const u = resolveMediaUrl(iconSrc);
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
  const reasons: Record<string, number> = {};
  const why = (err: unknown, code?: number) =>
    code === 404 || code === 410
      ? "expired"
      : code === 401 || code === 403
        ? "key"
        : /time ?out|ETIMEDOUT|ECONNRESET/i.test(err instanceof Error ? err.message : "")
          ? "timeout"
          : `other:${(err instanceof Error ? err.message : "error").slice(0, 120)}`;

  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
      while (next < rows.length) {
        const row = rows[next++];
        const sub = row.subscription;
        try {
          const vapidDetails = vapid.get(sub.keyId ?? null);
          if (!vapidDetails) throw Object.assign(new Error("The key this browser subscribed with was erased."), { statusCode: 410 });
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 86400, timeout: SEND_TIMEOUT_MS, vapidDetails });
          done.push(row.id);
          sent++;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            // The browser unsubscribed — forget it.
            deadSubs.push(sub.id);
            done.push(row.id);
            failed++;
            reasons.expired = (reasons.expired ?? 0) + 1;
          } else if (row.attempts + 1 >= MAX_ATTEMPTS) {
            done.push(row.id);
            failed++;
            const r = why(err, code);
            reasons[r] = (reasons[r] ?? 0) + 1;
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
  if (Object.keys(reasons).length) {
    // delivery log: why deliveries failed (one sender at a time, so read + write is safe)
    const cur = await prisma.$queryRawUnsafe<{ f: string | null }[]>("SELECT fail_info AS f FROM push_campaigns WHERE id = ?", campaign.id).catch(() => []);
    let info: Record<string, number> = {};
    try {
      info = JSON.parse(cur[0]?.f || "{}");
    } catch {}
    for (const [k, v] of Object.entries(reasons)) info[k] = (info[k] ?? 0) + v;
    await prisma.$executeRawUnsafe("UPDATE push_campaigns SET fail_info = ? WHERE id = ?", JSON.stringify(info).slice(0, 60000), campaign.id).catch(() => {});
  }
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
