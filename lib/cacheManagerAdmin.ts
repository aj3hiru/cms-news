"use server";

import { requireUser } from "./auth";
import {
  getCacheOverview,
  listCacheFiles,
  deleteCacheFile,
  clearAllCache,
  toggleCacheEnabled,
  preloadCache,
  maybeRunAutoClear,
  type CacheOverviewStats,
  type CacheFileInfo,
} from "./cache/pageCache";
import { getCacheSettings, saveCacheSettings, type CacheSettings } from "./cache/cacheSettings";
import { getRedisConfig, resetRedis, testRedisConnection, REDIS_DEFAULTS, REDIS_SETTINGS_KEY, type RedisSettings } from "./cache/objectCache";
import { prisma } from "./db";

async function requireAdmin() {
  const user = await requireUser();
  if (!user || user.role !== "admin") throw new Error("Admin access required.");
  return user;
}

export async function getCacheDashboardData(): Promise<{ overview: CacheOverviewStats; settings: CacheSettings }> {
  await requireAdmin();
  await maybeRunAutoClear();
  const [overview, settings] = await Promise.all([getCacheOverview(), getCacheSettings()]);
  return { overview, settings };
}

export async function getCacheFilesList(): Promise<CacheFileInfo[]> {
  await requireAdmin();
  return listCacheFiles();
}

export async function deleteOneCacheFile(name: string): Promise<void> {
  await requireAdmin();
  deleteCacheFile(name);
}

export async function clearEntireCache(): Promise<{ deleted: number }> {
  await requireAdmin();
  const deleted = await clearAllCache();
  return { deleted };
}

export async function setCacheEnabled(enabled: boolean): Promise<void> {
  await requireAdmin();
  await toggleCacheEnabled(enabled);
}

export async function updateCacheSettings(partial: Partial<CacheSettings>): Promise<void> {
  await requireAdmin();
  await saveCacheSettings(partial);
}

export async function runPreloadNow(): Promise<{ count: number }> {
  await requireAdmin();
  const count = await preloadCache(10);
  return { count };
}

// ── Legacy exports kept for anywhere still importing the old API ──────────
// (revalidatePath-based clearing was the previous implementation; now
//  superseded by clearEntireCache()/setCacheEnabled() above, which are
//  what the rebuilt Cache Manager dashboard actually calls.)
export async function clearHomepageCache(): Promise<void> {
  await requireAdmin();
  await clearAllCache();
}
export async function clearAllSiteCache(): Promise<void> {
  await requireAdmin();
  await clearAllCache();
}

// ── Redis (object cache) settings ────────────────────────────────────────

export interface RedisAdminView {
  enabled: boolean;
  host: string;
  port: number;
  db: number;
  hasPassword: boolean;
  /** "settings" = saved here, "env" = REDIS_URL in the server environment, "none". */
  source: "settings" | "env" | "none";
}

export interface RedisAdminInput {
  enabled: boolean;
  host: string;
  port: number;
  db: number;
  /** Empty = keep the saved password. */
  password: string;
  clearPassword?: boolean;
}

async function savedRedis(): Promise<RedisSettings | null> {
  const row = await prisma.appConfig.findUnique({ where: { configKey: REDIS_SETTINGS_KEY } });
  try {
    return row?.configValue ? { ...REDIS_DEFAULTS, ...(JSON.parse(row.configValue) as Partial<RedisSettings>) } : null;
  } catch {
    return null;
  }
}

/** Settings for the form — the password itself never leaves the server. */
export async function getRedisAdmin(): Promise<RedisAdminView> {
  await requireAdmin();
  const saved = await savedRedis();
  if (saved) return { enabled: saved.enabled, host: saved.host, port: saved.port, db: saved.db, hasPassword: Boolean(saved.password), source: "settings" };
  const env = await getRedisConfig(true);
  if (env) return { enabled: true, host: env.host, port: env.port, db: env.db, hasPassword: Boolean(env.password), source: "env" };
  return { enabled: false, host: REDIS_DEFAULTS.host, port: REDIS_DEFAULTS.port, db: REDIS_DEFAULTS.db, hasPassword: false, source: "none" };
}

function cleanRedisInput(input: RedisAdminInput, current: RedisSettings | null): RedisSettings | string {
  const host = String(input.host ?? "").trim();
  if (!host || host.length > 255 || !/^[A-Za-z0-9.\-:[\]]+$/.test(host)) return "Enter a valid host (e.g. 127.0.0.1).";
  const port = Math.trunc(Number(input.port));
  if (!(port >= 1 && port <= 65535)) return "Port must be between 1 and 65535.";
  const db = Math.trunc(Number(input.db));
  if (!(db >= 0 && db <= 15)) return "Database number must be 0–15.";
  const password = input.clearPassword ? "" : String(input.password ?? "") || current?.password || "";
  return { enabled: Boolean(input.enabled), host, port, db, password };
}

export async function testRedisAdmin(input: RedisAdminInput): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const s = cleanRedisInput(input, (await savedRedis()) ?? (await getRedisConfig(true)));
  if (typeof s === "string") return { ok: false, message: s };
  return testRedisConnection(s);
}

/** Saves the settings; turning Redis on only succeeds when the connection works. */
export async function saveRedisAdmin(input: RedisAdminInput): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const s = cleanRedisInput(input, (await savedRedis()) ?? (await getRedisConfig(true)));
  if (typeof s === "string") return { ok: false, message: s };
  let message = "Saved — Redis is off.";
  if (s.enabled) {
    const test = await testRedisConnection(s);
    if (!test.ok) return { ok: false, message: `Not saved: ${test.message}` };
    message = `Saved and connected. ${test.message}`;
  }
  await prisma.appConfig.upsert({
    where: { configKey: REDIS_SETTINGS_KEY },
    create: { configKey: REDIS_SETTINGS_KEY, configValue: JSON.stringify(s) },
    update: { configValue: JSON.stringify(s) },
  });
  await resetRedis();
  return { ok: true, message };
}
