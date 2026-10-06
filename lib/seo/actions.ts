"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "../db";
import { requireUser } from "../auth";
import { SEO_DEFAULTS, SEO_KEY, SCHEMA_TYPES, type SeoSettings } from "./settings";

/** Saves SEO settings (merged over what is stored). */
export async function saveSeoSettings(patch: Partial<SeoSettings>): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Only admins can change SEO settings." };
  const row = await prisma.appConfig.findUnique({ where: { configKey: SEO_KEY } });
  let current: Partial<SeoSettings> = {};
  try {
    current = row?.configValue ? JSON.parse(row.configValue) : {};
  } catch {}
  const next: SeoSettings = { ...SEO_DEFAULTS, ...current, ...patch };
  if (!(next.default_schema in SCHEMA_TYPES)) next.default_schema = "NewsArticle";
  const url = next.redirect_404_url.trim();
  next.redirect_404_url = url.startsWith("/") || /^https?:\/\//i.test(url) ? url : "";
  // Verification fields accept the whole <meta> tag too; keep only the code.
  for (const k of ["google_verification", "bing_verification", "yandex_verification", "pinterest_verification"] as const) {
    next[k] = (/content=["']([^"']+)["']/i.exec(next[k])?.[1] ?? next[k]).trim().slice(0, 200);
  }
  await prisma.appConfig.upsert({ where: { configKey: SEO_KEY }, create: { configKey: SEO_KEY, configValue: JSON.stringify(next) }, update: { configValue: JSON.stringify(next) } });
  revalidateTag("seo-settings", "max");
  revalidatePath("/", "layout");
  return { ok: true };
}
