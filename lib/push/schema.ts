import "server-only";
import { prisma } from "../db";
import { parseUserAgent } from "./ua";

/**
 * Push v2 tables and columns (see prisma/migrations_manual/add_push_v2.sql), added on first use so a deploy
 * needs no manual SQL. Additive only — nothing is removed or rewritten. Existing subscribers get their
 * device / OS / browser from the user agent saved with them.
 */
let ready: Promise<void> | null = null;

export function ensurePushSchema(): Promise<void> {
  ready ??= upgrade().catch((e) => {
    ready = null; // try again on the next call
    throw e;
  });
  return ready;
}

async function columns(table: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ c: string }[]>(
    "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    table
  );
  return new Set(rows.map((r) => r.c));
}

async function upgrade(): Promise<void> {
  const subCols = await columns("push_subscriptions");
  const addSub: Record<string, string> = {
    key_id: "INT NULL",
    device: "VARCHAR(20) NOT NULL DEFAULT ''",
    os: "VARCHAR(30) NOT NULL DEFAULT ''",
    browser: "VARCHAR(30) NOT NULL DEFAULT ''",
    region: "VARCHAR(80) NOT NULL DEFAULT ''",
    city: "VARCHAR(80) NOT NULL DEFAULT ''",
    lang: "VARCHAR(20) NOT NULL DEFAULT ''",
    tz: "VARCHAR(60) NOT NULL DEFAULT ''",
    updated_at: "DATETIME(3) NULL",
  };
  const missing = Object.entries(addSub).filter(([c]) => !subCols.has(c));
  if (missing.length) await prisma.$executeRawUnsafe(`ALTER TABLE push_subscriptions ${missing.map(([c, d]) => `ADD COLUMN \`${c}\` ${d}`).join(", ")}`);
  const idx = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    "SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'push_subscriptions' AND INDEX_NAME = 'idx_push_geo'"
  );
  if (!Number(idx[0]?.n ?? 0)) await prisma.$executeRawUnsafe("ALTER TABLE push_subscriptions ADD INDEX idx_push_geo (country, region)");

  const campCols = await columns("push_campaigns");
  const addCamp: Record<string, string> = { segment_id: "INT NULL", segment_name: "VARCHAR(120) NULL", icon: "VARCHAR(500) NULL" };
  const missingCamp = Object.entries(addCamp).filter(([c]) => !campCols.has(c));
  if (missingCamp.length) await prisma.$executeRawUnsafe(`ALTER TABLE push_campaigns ${missingCamp.map(([c, d]) => `ADD COLUMN \`${c}\` ${d}`).join(", ")}`);

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS push_keys (
    id INT NOT NULL AUTO_INCREMENT, public_key VARCHAR(255) NOT NULL, private_key VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL DEFAULT '', created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id), UNIQUE KEY push_keys_public_key_key (public_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS push_segments (
    id INT NOT NULL AUTO_INCREMENT, name VARCHAR(120) NOT NULL, rules TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  // existing subscribers: device / OS / browser from their saved user agent
  for (;;) {
    const rows = await prisma.pushSubscription.findMany({ where: { browser: "" }, take: 500, select: { id: true, userAgent: true, endpoint: true } });
    if (!rows.length) break;
    for (const r of rows) {
      const u = parseUserAgent(r.userAgent ?? "", false, r.endpoint);
      await prisma.pushSubscription.update({ where: { id: r.id }, data: { device: u.device, os: u.os, browser: u.browser || "Other" } });
    }
    if (rows.length < 500) break;
  }
}
