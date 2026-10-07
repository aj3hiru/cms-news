import "server-only";
import { prisma } from "../db";

/**
 * Optional Redis object cache (Cache Manager → Settings → Redis, or REDIS_URL as a fallback).
 * Built so Redis can never slow down or break a page:
 *  - short connect / command timeouts, no queueing while disconnected;
 *  - after a failure it is skipped for 30 s (pages carry on without it);
 *  - every key is prefixed "cmsnews:" and lives in its own database number, and clearing walks our prefix
 *    with SCAN — other sites on the same Redis server (e.g. Fable) are never touched.
 */

export const KEY_PREFIX = "cmsnews:";
export const REDIS_SETTINGS_KEY = "redis_settings";

export interface RedisSettings {
  enabled: boolean;
  host: string;
  port: number;
  password: string;
  db: number;
}

export const REDIS_DEFAULTS: RedisSettings = { enabled: false, host: "127.0.0.1", port: 6379, password: "", db: 2 };

let settingsMemo: { at: number; value: RedisSettings | null } | null = null;

/** Saved settings (admin), or REDIS_URL; null = Redis off. Kept 30 s in memory. */
export async function getRedisConfig(fresh = false): Promise<RedisSettings | null> {
  if (!fresh && settingsMemo && Date.now() - settingsMemo.at < 30_000) return settingsMemo.value;
  let value: RedisSettings | null = null;
  try {
    const row = await prisma.appConfig.findUnique({ where: { configKey: REDIS_SETTINGS_KEY } });
    if (row?.configValue) {
      const s = { ...REDIS_DEFAULTS, ...(JSON.parse(row.configValue) as Partial<RedisSettings>) };
      value = s.enabled ? s : null;
    } else if (process.env.REDIS_URL) {
      const u = new URL(process.env.REDIS_URL);
      value = { enabled: true, host: u.hostname, port: Number(u.port) || 6379, password: decodeURIComponent(u.password), db: Number(u.pathname.slice(1)) || 0 };
    }
  } catch {
    value = null;
  }
  settingsMemo = { at: Date.now(), value };
  return value;
}

export function isRedisConfigured(): boolean {
  return Boolean(settingsMemo?.value) || Boolean(process.env.REDIS_URL);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;
const g = globalThis as unknown as { __nbRedis?: { sig: string; client: Promise<Client | null> } | null; __nbRedisDownUntil?: number };

const sigOf = (s: RedisSettings) => `${s.host}:${s.port}/${s.db}#${s.password.length}:${s.password.slice(-2)}`;

async function connect(s: RedisSettings): Promise<Client | null> {
  const mod = await import("ioredis").catch(() => null);
  if (!mod) return null;
  const RedisCtor = (mod as unknown as { default?: unknown }).default ?? mod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new (RedisCtor as any)({
    host: s.host,
    port: s.port,
    password: s.password || undefined,
    db: s.db,
    keyPrefix: KEY_PREFIX,
    lazyConnect: true,
    connectTimeout: 2000,
    commandTimeout: 800,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => Math.min(times * 500, 5000),
  });
  client.on("error", () => {}); // reported through the commands' own failures
  await client.connect();
  return client;
}

/** Shared client, or null when Redis is off / unreachable (then retried after 30 s). */
async function getClient(): Promise<Client | null> {
  const s = await getRedisConfig();
  if (!s) {
    if (g.__nbRedis) void dropClient();
    return null;
  }
  if ((g.__nbRedisDownUntil ?? 0) > Date.now()) return null;
  const sig = sigOf(s);
  if (!g.__nbRedis || g.__nbRedis.sig !== sig) {
    if (g.__nbRedis) void dropClient();
    g.__nbRedis = { sig, client: connect(s).catch(() => null) };
  }
  const client = await g.__nbRedis.client;
  if (!client || client.status !== "ready") {
    markDown();
    return null;
  }
  return client;
}

function markDown() {
  g.__nbRedisDownUntil = Date.now() + 30_000;
  void dropClient();
}

async function dropClient() {
  const cur = g.__nbRedis;
  g.__nbRedis = null;
  const c = await cur?.client.catch(() => null);
  try {
    c?.disconnect();
  } catch {}
}

/** Forget the cached settings/connection (after the admin saves new Redis settings). */
export async function resetRedis(): Promise<void> {
  settingsMemo = null;
  g.__nbRedisDownUntil = 0;
  await dropClient();
}

async function run<T>(fn: (c: Client) => Promise<T>, fallback: T): Promise<T> {
  try {
    const c = await getClient();
    if (!c) return fallback;
    return await fn(c);
  } catch {
    markDown();
    return fallback;
  }
}

export const objectCachePing = () => run(async (c) => (await c.ping()) === "PONG", false);
export const objectCacheGet = (key: string) => run<string | null>((c) => c.get(key), null);

export function objectCacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  return run(async (c) => {
    if (ttlSeconds) await c.set(key, value, "EX", ttlSeconds);
    else await c.set(key, value);
  }, undefined);
}

/** Deletes our keys matching `pattern` (e.g. "*" = everything of this site), with SCAN — never KEYS. */
export function objectCacheDelete(pattern: string): Promise<number> {
  return run(async (c) => {
    let cursor = "0";
    let deleted = 0;
    do {
      const [next, keys]: [string, string[]] = await c.scan(cursor, "MATCH", KEY_PREFIX + pattern, "COUNT", 500);
      cursor = next;
      // SCAN returns full key names; the client adds the prefix again on DEL, so strip it.
      if (keys.length) deleted += await c.del(...keys.map((k) => k.slice(KEY_PREFIX.length)));
    } while (cursor !== "0");
    return deleted;
  }, 0);
}

/** Redis server facts for the Cache Manager: version, memory in use, how many keys this site has. */
export function objectCacheInfo(): Promise<{ version: string; usedMemory: string; keys: number } | null> {
  return run(async (c) => {
    const [server, memory] = await Promise.all([c.info("server"), c.info("memory")]);
    let cursor = "0";
    let keys = 0;
    let rounds = 0;
    do {
      const [next, batch]: [string, string[]] = await c.scan(cursor, "MATCH", KEY_PREFIX + "*", "COUNT", 1000);
      cursor = next;
      keys += batch.length;
    } while (cursor !== "0" && ++rounds < 50);
    const pick = (text: string, name: string) => (text.match(new RegExp(`^${name}:(.*)$`, "m"))?.[1] ?? "").trim();
    return { version: pick(server, "redis_version"), usedMemory: pick(memory, "used_memory_human"), keys };
  }, null);
}

/** Tries a connection with the given settings without saving them (Cache Manager → Test). */
export async function testRedisConnection(s: RedisSettings): Promise<{ ok: boolean; message: string }> {
  let client: Client | null = null;
  try {
    client = await connect(s);
    if (!client) return { ok: false, message: "The Redis library (ioredis) isn't installed on the server." };
    const pong = await client.ping();
    const info: string = await client.info("server");
    const version = info.match(/^redis_version:(.*)$/m)?.[1]?.trim() ?? "?";
    return pong === "PONG" ? { ok: true, message: `Connected — Redis ${version}, database ${s.db}.` } : { ok: false, message: "Redis answered unexpectedly." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/WRONGPASS|NOAUTH|invalid password/i.test(msg)) return { ok: false, message: "Wrong password." };
    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) return { ok: false, message: `Can't reach Redis at ${s.host}:${s.port} (${msg.slice(0, 80)}).` };
    return { ok: false, message: msg.slice(0, 160) };
  } finally {
    try {
      client?.disconnect();
    } catch {}
  }
}
