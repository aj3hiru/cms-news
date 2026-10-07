import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "./customize.css";
import { requireUser } from "@/lib/auth";
import { getAppConfig, getSiteSettings, resolveSiteConfig } from "@/lib/config";
import { THEME_KEY } from "@/lib/theme/settings";
import { mergeTheme } from "@/lib/theme/types";
import { prisma } from "@/lib/db";
import { Customizer } from "@/components/admin/customizer/Customizer";
import { getThemeBackupDate } from "@/lib/theme/actions";

export const metadata: Metadata = { title: "Customize" };
export const dynamic = "force-dynamic";

export default async function CustomizePage() {
  const user = await requireUser();
  if (!user || user.role !== "admin") redirect("/admin/dashboard");
  // Read straight from the database (not the cache) so the panel always shows what is saved.
  const [row, app, settings, cfg, backupAt] = await Promise.all([
    prisma.appConfig.findUnique({ where: { configKey: THEME_KEY } }),
    getAppConfig(),
    getSiteSettings(),
    resolveSiteConfig(""),
    getThemeBackupDate(),
  ]);
  let saved: unknown = null;
  try {
    saved = row?.configValue ? JSON.parse(row.configValue) : null;
  } catch {}
  return (
    <Customizer
      initial={mergeTheme(saved)}
      identity={{ siteTitle: app.site_title ?? cfg.siteName, tagline: app.site_tagline ?? "", logo: settings.site_logo ?? "", favicon: app.site_favicon ?? "" }}
      siteUrl={cfg.siteUrl}
      backupAt={backupAt}
    />
  );
}
