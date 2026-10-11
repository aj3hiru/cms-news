import { randomBytes } from "crypto";
import { prisma } from "./db";
import { resolveSiteConfig } from "./config";
import { loadSeoSettingsFresh } from "./seo/settings";

/**
 * IndexNow: tells Bing, Yandex, Seznam, Naver etc. about new or changed URLs
 * the moment a post is published, instead of waiting for a crawl. (Google
 * reads the sitemaps and the feed.) The key is served at /indexnow-key.txt.
 * The Instant Indexing module (SEO → Dashboard) switches the automatic pings; every submission is kept in a short history.
 */
export async function indexNowKey(): Promise<string> {
  const row = await prisma.appConfig.findUnique({ where: { configKey: "indexnow_key" } });
  if (row?.configValue) return row.configValue;
  const key = randomBytes(16).toString("hex");
  await prisma.appConfig.upsert({ where: { configKey: "indexnow_key" }, create: { configKey: "indexnow_key", configValue: key }, update: {} });
  return (await prisma.appConfig.findUnique({ where: { configKey: "indexnow_key" } }))?.configValue ?? key;
}

export interface IndexNowLogEntry {
  at: string;
  urls: string[];
  status: number;
  ok: boolean;
  manual: boolean;
  message: string;
}

const LOG_KEY = "indexnow_log";

export async function indexNowLog(): Promise<IndexNowLogEntry[]> {
  try {
    const row = await prisma.appConfig.findUnique({ where: { configKey: LOG_KEY } });
    const v = row?.configValue ? JSON.parse(row.configValue) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function addLog(e: IndexNowLogEntry) {
  try {
    const list = [{ ...e, urls: e.urls.slice(0, 20) }, ...(await indexNowLog())].slice(0, 100);
    await prisma.appConfig.upsert({ where: { configKey: LOG_KEY }, create: { configKey: LOG_KEY, configValue: JSON.stringify(list) }, update: { configValue: JSON.stringify(list) } });
  } catch {
    /* history is best effort */
  }
}

export async function clearIndexNowLog() {
  await prisma.appConfig.deleteMany({ where: { configKey: LOG_KEY } });
}

const ANSWERS: Record<number, string> = {
  200: "OK — URLs submitted.",
  202: "Accepted — the key will be checked, URLs are queued.",
  400: "Bad request — invalid format.",
  403: "Forbidden — the key is not valid (is /indexnow-key.txt reachable?).",
  422: "Unprocessable — the URLs don’t belong to this host or the key doesn’t match.",
  429: "Too many requests — try again later.",
};

/** Sends the URLs now and reports the answer. Paths like "/my-post" or full URLs. */
export async function submitIndexNow(paths: string[], manual = false): Promise<{ ok: boolean; status: number; message: string }> {
  const { siteUrl } = await resolveSiteConfig("");
  const base = siteUrl.replace(/\/+$/, "");
  let host = "";
  try {
    host = new URL(base).host;
  } catch {
    return { ok: false, status: 0, message: "The site address in General Settings is not valid." };
  }
  const urlList = [...new Set(paths.map((p) => p.trim()).filter(Boolean).map((p) => (/^https?:\/\//.test(p) ? p : `${base}${p.startsWith("/") ? "" : "/"}${p}`)))].slice(0, 10000);
  if (!urlList.length) return { ok: false, status: 0, message: "No URLs to submit." };
  if (/^(localhost|127\.|0\.0\.0\.0)/.test(host)) {
    const r = { ok: false, status: 0, message: "Not sent: this is a local copy of the site (search engines can’t reach localhost)." };
    if (manual) await addLog({ at: new Date().toISOString(), urls: urlList, manual, ...r });
    return r;
  }
  let res: { ok: boolean; status: number; message: string };
  try {
    const key = await indexNowKey();
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `${base}/indexnow-key.txt`, urlList }),
      signal: AbortSignal.timeout(10_000),
    });
    res = { ok: r.ok || r.status === 202, status: r.status, message: ANSWERS[r.status] ?? `Answered ${r.status}.` };
  } catch (e) {
    res = { ok: false, status: 0, message: `Could not reach IndexNow: ${e instanceof Error ? e.message : String(e)}` };
  }
  await addLog({ at: new Date().toISOString(), urls: urlList, manual, ...res });
  return res;
}

/** Fire-and-forget (post saved / published); never throws. Off when the Instant Indexing module is off. */
export function pingIndexNow(paths: string[]): void {
  void (async () => {
    try {
      if (paths.length === 0) return;
      if (!(await loadSeoSettingsFresh()).m_instant_indexing) return; // direct read: also runs from cron, outside a request
      const r = await submitIndexNow(paths, false);
      if (!r.ok && r.status) console.warn(`IndexNow answered ${r.status}`);
    } catch (e) {
      console.warn("IndexNow ping failed:", e instanceof Error ? e.message : e);
    }
  })();
}
