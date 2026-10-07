"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "../db";
import { requireUser } from "../auth";
import { THEME_DRAFT_KEY, THEME_KEY } from "./settings";
import { categoryUrl, postUrl, staticPagePath, tagUrl } from "../urls";
import { mergeTheme, type ThemeSettings } from "./types";

export interface IdentityInput {
  siteTitle: string;
  tagline: string;
  logo: string;
  favicon: string;
}

const upsertConfig = (key: string, value: string) =>
  prisma.appConfig.upsert({ where: { configKey: key }, create: { configKey: key, configValue: value }, update: { configValue: value } });
const upsertSetting = (key: string, value: string) =>
  prisma.siteSetting.upsert({ where: { settingKey: key }, create: { settingKey: key, settingValue: value }, update: { settingValue: value } });

/** Customizer → Publish. Saves the whole theme plus the Site Identity fields shared with General Settings. */
export async function publishTheme(theme: ThemeSettings, identity: IdentityInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Only admins can change the site design." };

  // Re-merge so a malformed or partial payload can never break the site.
  const clean = mergeTheme(theme);
  const json = JSON.stringify(clean);
  if (json.length > 2_000_000) return { ok: false, error: "Settings are too large." };

  const title = identity.siteTitle.trim().slice(0, 150);
  const tagline = identity.tagline.trim().slice(0, 255);
  await Promise.all([
    upsertConfig(THEME_KEY, json),
    upsertConfig("site_title", title),
    upsertConfig("site_tagline", tagline),
    upsertConfig("site_favicon", identity.favicon.trim()),
    upsertSetting("site_title", title),
    upsertSetting("site_logo", identity.logo.trim()),
    upsertSetting("display_mode", identity.logo.trim() ? "logo" : "text"),
  ]);

  await prisma.appConfig.deleteMany({ where: { configKey: THEME_DRAFT_KEY } });
  for (const tag of ["theme-settings", "app-config", "site-settings", "header-settings", "footer-settings"]) revalidateTag(tag, "max");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Customizer: keeps the unpublished changes so the preview can show them. */
export async function saveThemeDraft(theme: ThemeSettings, identity: IdentityInput): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return { ok: false };
  const json = JSON.stringify({ theme: mergeTheme(theme), identity });
  if (json.length > 2_000_000) return { ok: false };
  await upsertConfig(THEME_DRAFT_KEY, json);
  return { ok: true };
}

export async function discardThemeDraft(): Promise<void> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return;
  await prisma.appConfig.deleteMany({ where: { configKey: THEME_DRAFT_KEY } });
}

export interface MenuSource {
  label: string;
  url: string;
  kind: string;
}

/** Items for the Menus "Add Items" panel (pages, posts, categories, tags). */
export async function getMenuSources(kind: "pages" | "posts" | "categories" | "tags", q = ""): Promise<MenuSource[]> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return [];
  const term = q.trim();
  if (kind === "pages") {
    const rows = await prisma.page.findMany({ where: { status: "published", ...(term ? { title: { contains: term } } : {}) }, orderBy: { title: "asc" }, take: 30, select: { title: true, slug: true } });
    return [{ label: "Home", url: "/", kind: "Front Page" }, ...rows.map((r) => ({ label: r.title, url: staticPagePath(r.slug), kind: "Page" }))].filter((r) => !term || r.label.toLowerCase().includes(term.toLowerCase()));
  }
  if (kind === "posts") {
    const rows = await prisma.post.findMany({ where: { status: "published", ...(term ? { title: { contains: term } } : {}) }, orderBy: { date: "desc" }, take: 20, select: { title: true, slug: true } });
    return rows.map((r) => ({ label: r.title, url: postUrl(r.slug), kind: "Post" }));
  }
  if (kind === "categories") {
    const rows = await prisma.category.findMany({ where: term ? { name: { contains: term } } : {}, orderBy: { name: "asc" }, take: 50, select: { name: true, slug: true } });
    return [{ label: "All Categories", url: "/categories", kind: "Archive" }, ...rows.map((r) => ({ label: r.name, url: categoryUrl(r.slug), kind: "Category" }))];
  }
  const rows = await prisma.tag.findMany({ where: term ? { name: { contains: term } } : {}, orderBy: { name: "asc" }, take: 40, select: { id: true, name: true, slug: true } });
  return rows.map((r) => ({ label: r.name, url: tagUrl(r.slug, Number(r.id)), kind: "Tag" }));
}

/** Posts for the Also Read "pick posts" search. */
export async function searchPostsBrief(q: string): Promise<{ id: number; title: string; date: string | null }[]> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return [];
  const rows = await prisma.post.findMany({
    where: { status: "published", ...(q.trim() ? { title: { contains: q.trim() } } : {}) },
    orderBy: { date: "desc" },
    take: 15,
    select: { id: true, title: true, date: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, date: r.date?.toISOString() ?? null }));
}

export async function getPostTitles(ids: number[]): Promise<Record<number, string>> {
  const user = await requireUser();
  if (!user || user.role !== "admin" || !ids.length) return {};
  const rows = await prisma.post.findMany({ where: { id: { in: ids.slice(0, 100) } }, select: { id: true, title: true } });
  return Object.fromEntries(rows.map((r) => [r.id, r.title]));
}

const THEME_BACKUP_KEY = "theme_backup";
const refreshTheme = () => {
  for (const tag of ["theme-settings", "app-config", "site-settings", "header-settings", "footer-settings"]) revalidateTag(tag, "max");
  revalidatePath("/", "layout");
};

/**
 * Customizer → Reset: the design (colours, fonts, header, menus, footer, post template, cookie popup…) goes back
 * to the defaults. Only the theme setting is touched — posts, pages, media, push, SEO and the site name stay.
 * The previous design is kept as a backup so the reset can be undone.
 */
export async function resetTheme(): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Only admins can change the site design." };
  const current = await prisma.appConfig.findUnique({ where: { configKey: THEME_KEY } });
  if (current?.configValue) await upsertConfig(THEME_BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), value: current.configValue }));
  await prisma.appConfig.deleteMany({ where: { configKey: { in: [THEME_KEY, THEME_DRAFT_KEY] } } });
  refreshTheme();
  return { ok: true };
}

/** Puts back the design that was there before the last reset. */
export async function undoThemeReset(): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Only admins can change the site design." };
  const row = await prisma.appConfig.findUnique({ where: { configKey: THEME_BACKUP_KEY } });
  let value = "";
  try {
    value = row?.configValue ? (JSON.parse(row.configValue) as { value: string }).value : "";
  } catch {}
  if (!value) return { ok: false, error: "No earlier design was saved." };
  await upsertConfig(THEME_KEY, JSON.stringify(mergeTheme(JSON.parse(value))));
  await prisma.appConfig.deleteMany({ where: { configKey: { in: [THEME_BACKUP_KEY, THEME_DRAFT_KEY] } } });
  refreshTheme();
  return { ok: true };
}

/** When the last reset happened (for the "Undo" button), or null. */
export async function getThemeBackupDate(): Promise<string | null> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return null;
  const row = await prisma.appConfig.findUnique({ where: { configKey: THEME_BACKUP_KEY } });
  try {
    return row?.configValue ? (JSON.parse(row.configValue) as { at: string }).at : null;
  } catch {
    return null;
  }
}
