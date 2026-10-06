import { cache } from "react";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { prisma } from "../db";
import { mergeTheme, type ThemeSettings } from "./types";

export const THEME_KEY = "theme_settings";
/** Unpublished Customizer changes, shown only to the person previewing (Next.js draft mode). */
export const THEME_DRAFT_KEY = "theme_draft";

export interface ThemeDraft {
  theme: ThemeSettings;
  identity: { siteTitle: string; tagline: string; logo: string; favicon: string };
}

const getThemeCached = unstable_cache(
  async (): Promise<ThemeSettings> => {
    try {
      const row = await prisma.appConfig.findUnique({ where: { configKey: THEME_KEY } });
      return mergeTheme(row?.configValue ? JSON.parse(row.configValue) : null);
    } catch {
      return mergeTheme(null);
    }
  },
  ["theme-settings"],
  { revalidate: 300, tags: ["theme-settings"] }
);

async function isDraft(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false; // outside a request (build, cron)
  }
}

/** The Customizer draft, when this request is a Customizer preview. */
export const getThemeDraft = cache(async (): Promise<ThemeDraft | null> => {
  if (!(await isDraft())) return null;
  try {
    const row = await prisma.appConfig.findUnique({ where: { configKey: THEME_DRAFT_KEY } });
    if (!row?.configValue) return null;
    const d = JSON.parse(row.configValue) as ThemeDraft;
    return { theme: mergeTheme(d.theme), identity: d.identity };
  } catch {
    return null;
  }
});

/** The saved theme (Customizer), merged over the defaults — or the draft inside the preview. */
export const getTheme = cache(async (): Promise<ThemeSettings> => (await getThemeDraft())?.theme ?? getThemeCached());
