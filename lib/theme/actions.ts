"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "../db";
import { requireUser } from "../auth";
import { THEME_KEY } from "./settings";
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

  for (const tag of ["theme-settings", "app-config", "site-settings", "header-settings", "footer-settings"]) revalidateTag(tag, "max");
  revalidatePath("/", "layout");
  return { ok: true };
}
