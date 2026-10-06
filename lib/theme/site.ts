import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "../db";
import { getAppConfig, getSiteSettings, resolveSiteConfig } from "../config";
import { resolveMediaUrl } from "../urls";
import { getTheme } from "./settings";
import type { ShortcodeContext } from "../shortcodes";
import type { ThemeSettings } from "./types";

export interface SiteContext {
  theme: ThemeSettings;
  siteName: string;
  siteUrl: string;
  tagline: string;
  logo: string;
  retinaLogo: string;
  sc: ShortcodeContext;
  categories: { name: string; slug: string }[];
}

const getCategoriesCached = unstable_cache(
  async () => {
    try {
      return await prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } });
    } catch {
      return [];
    }
  },
  ["theme-categories"],
  { revalidate: 300, tags: ["categories"] }
);

/** Everything the public header / footer / templates need, read once per request. */
export const getSiteContext = cache(async (): Promise<SiteContext> => {
  const [theme, cfg, settings, app, categories] = await Promise.all([
    getTheme(),
    resolveSiteConfig(process.env.APP_URL?.trim() || ""),
    getSiteSettings(),
    getAppConfig(),
    getCategoriesCached(),
  ]);
  const rawLogo = settings.site_logo?.trim() ?? "";
  return {
    theme,
    siteName: cfg.siteName,
    siteUrl: cfg.siteUrl,
    tagline: cfg.siteTagline,
    logo: rawLogo ? resolveMediaUrl(rawLogo) : "",
    retinaLogo: theme.identity.retina_logo ? resolveMediaUrl(theme.identity.retina_logo) : "",
    sc: { siteName: cfg.siteName, siteUrl: cfg.siteUrl, tagline: cfg.siteTagline, email: app.admin_email?.trim() || cfg.contactEmail },
    categories,
  };
});
