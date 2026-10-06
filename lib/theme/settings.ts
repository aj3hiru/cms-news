import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "../db";
import { mergeTheme, type ThemeSettings } from "./types";

export const THEME_KEY = "theme_settings";

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

/** The saved theme (Customizer), merged over the defaults. */
export const getTheme = cache(getThemeCached);
