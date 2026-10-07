import { prisma } from "./db";
import { activeRules, ruleFor, releaseSoon } from "./viewAdjust";

/**
 * Page views are counted in memory and written to the database in batches (every few seconds), so a traffic
 * spike costs a handful of queries per batch instead of 6 queries per view — the database has only 5
 * connections. Same results as writing each view straight away: totals, daily/hourly stats per source and
 * country, one visitor-log row per visitor per post per day, and held views for traffic-adjustment rules.
 */

const FLUSH_MS = 3000;
const FLUSH_AT = 2000; // views — write sooner during a spike
const POST_TTL_MS = 5 * 60_000;
const MISS_TTL_MS = 60_000;

type PostRef = { id: number; authorUserId: number };
export interface ViewEvent {
  post: PostRef;
  visitorId: string;
  visitDate: Date; // IST calendar date
  statHour: Date;
  source: string;
  country: string;
}

interface Batch {
  views: number;
  postViews: Map<number, number>;
  daily: Map<string, { postId: number; statDate: Date; source: string; country: string; n: number }>;
  hourly: Map<string, { postId: number; statHour: Date; source: string; country: string; n: number }>;
  visitors: Map<string, { visitDate: Date; visitorId: string; postId: number }>;
  holds: Map<string, { postId: number; authorUserId: number; statHour: Date; statDate: Date; source: string; country: string; n: number }>;
}

const newBatch = (): Batch => ({ views: 0, postViews: new Map(), daily: new Map(), hourly: new Map(), visitors: new Map(), holds: new Map() });

// One buffer per server process (kept on globalThis so dev reloads don't lose it).
const g = globalThis as unknown as { __nbViews?: { batch: Batch; timer: ReturnType<typeof setTimeout> | null; flushing: Promise<void> | null; posts: Map<string, { ref: PostRef | null; at: number }> } };
const state = (g.__nbViews ??= { batch: newBatch(), timer: null, flushing: null, posts: new Map() });

/** Published post for a slug, from memory when possible (unknown slugs are remembered briefly too). */
export async function postForSlug(slug: string): Promise<PostRef | null> {
  const hit = state.posts.get(slug);
  if (hit && Date.now() - hit.at < (hit.ref ? POST_TTL_MS : MISS_TTL_MS)) return hit.ref;
  const row = await prisma.post.findFirst({ where: { slug, status: "published" }, select: { id: true, author: { select: { userId: true } } } });
  const ref = row ? { id: row.id, authorUserId: row.author.userId } : null;
  if (state.posts.size > 20000) state.posts.clear();
  state.posts.set(slug, { ref, at: Date.now() });
  return ref;
}

export function recordView(e: ViewEvent): void {
  const b = state.batch;
  const pid = e.post.id;
  b.views++;
  b.postViews.set(pid, (b.postViews.get(pid) ?? 0) + 1);
  const dk = `${pid}|${e.visitDate.getTime()}|${e.source}|${e.country}`;
  const d = b.daily.get(dk);
  if (d) d.n++;
  else b.daily.set(dk, { postId: pid, statDate: e.visitDate, source: e.source, country: e.country, n: 1 });
  const hk = `${pid}|${e.statHour.getTime()}|${e.source}|${e.country}`;
  const h = b.hourly.get(hk);
  if (h) h.n++;
  else b.hourly.set(hk, { postId: pid, statHour: e.statHour, source: e.source, country: e.country, n: 1 });
  b.visitors.set(`${e.visitDate.getTime()}|${e.visitorId}|${pid}`, { visitDate: e.visitDate, visitorId: e.visitorId, postId: pid });
  const gk = `${pid}|${e.post.authorUserId}|${e.statHour.getTime()}|${e.source}|${e.country}`;
  const gh = b.holds.get(gk);
  if (gh) gh.n++;
  else b.holds.set(gk, { postId: pid, authorUserId: e.post.authorUserId, statHour: e.statHour, statDate: e.visitDate, source: e.source, country: e.country, n: 1 });

  if (b.views >= FLUSH_AT) void flushViews();
  else if (!state.timer) state.timer = setTimeout(() => void flushViews(), FLUSH_MS);
}

/** Writes everything counted so far (one batch at a time). */
export async function flushViews(): Promise<void> {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  if (state.flushing) return state.flushing;
  const b = state.batch;
  if (b.views === 0) return;
  state.batch = newBatch();
  state.flushing = writeBatch(b)
    .catch((err) => console.error("view batch write failed:", err))
    .finally(() => {
      state.flushing = null;
      if (state.batch.views > 0 && !state.timer) state.timer = setTimeout(() => void flushViews(), FLUSH_MS);
    });
  return state.flushing;
}

async function writeBatch(b: Batch): Promise<void> {
  for (const [postId, n] of b.postViews) {
    await prisma.postView.upsert({
      where: { postId_chapterNumber: { postId, chapterNumber: 1 } },
      create: { postId, chapterNumber: 1, views: n },
      update: { views: { increment: n } },
    });
  }
  const visitors = [...b.visitors.values()];
  for (let i = 0; i < visitors.length; i += 1000) {
    const chunk = visitors.slice(i, i + 1000);
    await prisma.chapterVisitorLog.createMany({ data: chunk.map((v) => ({ ...v, chapterNumber: 1 })), skipDuplicates: true });
    await prisma.visitorLog.createMany({ data: chunk, skipDuplicates: true });
  }
  for (const d of b.daily.values()) {
    await prisma.postStatsDaily.upsert({
      where: { uniq_post_date_source_country: { postId: d.postId, statDate: d.statDate, source: d.source, country: d.country } },
      create: { postId: d.postId, statDate: d.statDate, source: d.source, country: d.country, views: d.n },
      update: { views: { increment: d.n } },
    });
  }
  for (const h of b.hourly.values()) {
    await prisma.postStatsHourly.upsert({
      where: { uniq_post_hour_source_country: { postId: h.postId, statHour: h.statHour, source: h.source, country: h.country } },
      create: { postId: h.postId, statHour: h.statHour, source: h.source, country: h.country, views: h.n },
      update: { views: { increment: h.n } },
    });
  }
  // Traffic-adjustment rules: one held row per view, as before (released later by releaseHeldViews).
  const rules = await activeRules();
  if (rules.length) {
    const rows: { postId: number; ruleId: number; statHour: Date; statDate: Date; source: string; country: string }[] = [];
    for (const v of b.holds.values()) {
      const rule = ruleFor(rules, v.authorUserId, v.country);
      if (!rule) continue;
      for (let i = 0; i < v.n; i++) rows.push({ postId: v.postId, ruleId: rule.id, statHour: v.statHour, statDate: v.statDate, source: v.source, country: v.country });
    }
    for (let i = 0; i < rows.length; i += 1000) await prisma.analyticsHeldView.createMany({ data: rows.slice(i, i + 1000) });
  }
  releaseSoon();
}
