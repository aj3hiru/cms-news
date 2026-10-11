"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "../db";
import { requireUser } from "../auth";
import { SEO_DEFAULTS, SEO_KEY, SCHEMA_TYPES, type SeoSettings } from "./settings";

const VERIFY = ["google_verification", "bing_verification", "yandex_verification", "pinterest_verification", "baidu_verification", "norton_verification"] as const;

/** Keeps only known keys with the right type, so an import file or an old value can never break the site. */
function clean(input: Partial<SeoSettings>): SeoSettings {
  const next = { ...SEO_DEFAULTS } as Record<string, unknown>;
  for (const [k, def] of Object.entries(SEO_DEFAULTS)) {
    const v = (input as Record<string, unknown>)[k];
    if (v === undefined || v === null) continue;
    if (typeof def === "boolean") next[k] = v === true || v === "1" || v === "on" || v === "true";
    else if (typeof def === "number") next[k] = Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : def;
    else next[k] = String(v);
  }
  const s = next as unknown as SeoSettings;
  if (!(s.default_schema in SCHEMA_TYPES)) s.default_schema = "NewsArticle";
  const url = s.redirect_404_url.trim();
  s.redirect_404_url = url.startsWith("/") || /^https?:\/\//i.test(url) ? url : "";
  // Verification fields accept the whole <meta> tag too; keep only the code.
  for (const k of VERIFY) s[k] = (/content=["']([^"']+)["']/i.exec(s[k])?.[1] ?? s[k]).trim().slice(0, 200);
  s.sm_per = Math.max(10, Math.min(50000, s.sm_per || 1000));
  s.max_snippet = Math.max(-1, s.max_snippet);
  s.max_video_preview = Math.max(-1, s.max_video_preview);
  if (!["large", "standard", "none"].includes(s.max_image_preview)) s.max_image_preview = "large";
  if (!["summary_large_image", "summary"].includes(s.twitter_card)) s.twitter_card = "summary_large_image";
  if (!["easy", "advanced"].includes(s.wizard_level)) s.wizard_level = "easy";
  for (const k of ["sm_exclude_posts", "sm_exclude_terms", "news_exclude_cats"] as const) {
    s[k] = s[k].split(/[\s,]+/).filter((x) => /^\d+$/.test(x)).join(", ");
  }
  s.robots_txt = s.robots_txt.replace(/\r\n/g, "\n").slice(0, 20000);
  return s;
}

async function isAdmin() {
  const user = await requireUser();
  return Boolean(user && user.role === "admin");
}

async function store(next: SeoSettings) {
  await prisma.appConfig.upsert({ where: { configKey: SEO_KEY }, create: { configKey: SEO_KEY, configValue: JSON.stringify(next) }, update: { configValue: JSON.stringify(next) } });
  revalidateTag("seo-settings", "max");
  revalidatePath("/", "layout");
}

async function current(): Promise<Partial<SeoSettings>> {
  const row = await prisma.appConfig.findUnique({ where: { configKey: SEO_KEY } });
  try {
    return row?.configValue ? JSON.parse(row.configValue) : {};
  } catch {
    return {};
  }
}

/** Saves SEO settings (merged over what is stored). */
export async function saveSeoSettings(patch: Partial<SeoSettings>): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Only admins can change SEO settings." };
  await store(clean({ ...(await current()), ...patch }));
  return { ok: true };
}

/** Status & Tools → Reset: every SEO option back to its default (the wizard runs again). */
export async function resetSeoSettings(): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Only admins can change SEO settings." };
  await store({ ...SEO_DEFAULTS });
  return { ok: true };
}

/** Status & Tools → Import: a JSON file made by Export (this site or another one). */
export async function importSeoSettings(json: string): Promise<{ ok: boolean; error?: string; count?: number }> {
  if (!(await isAdmin())) return { ok: false, error: "Only admins can change SEO settings." };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "This is not a valid settings file." };
  }
  const src = (data && typeof data === "object" && "settings" in data ? data.settings : data) as Record<string, unknown>;
  if (!src || typeof src !== "object") return { ok: false, error: "This is not a valid settings file." };
  const known = Object.keys(src).filter((k) => k in SEO_DEFAULTS);
  if (!known.length) return { ok: false, error: "The file has no SEO settings in it." };
  await store(clean({ ...(await current()), ...Object.fromEntries(known.map((k) => [k, src[k]])) }));
  return { ok: true, count: known.length };
}
