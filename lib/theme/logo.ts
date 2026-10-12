import "server-only";
import { getImageInfo } from "@/lib/seo/imageSize";
import type { ThemeSettings } from "./types";

/**
 * Header logo size, WordPress-style: one width, the height follows the image's own shape.
 * Until "Logo width" is saved once (0), it is the width the logo had before — the old CSS sized it by the
 * header height — so nothing moves. Phones get the same share as before (40px of the header height).
 */
export async function logoSize(theme: ThemeSettings, rawLogo: string): Promise<{ w: number; h: number; wm: number }> {
  const info = rawLogo ? await getImageInfo(rawLogo.replace(/^\/+/, "")).catch(() => null) : null;
  const ratio = info && info.width > 0 && info.height > 0 ? info.width / info.height : 0;
  const hd = Math.max(30, Math.min(120, theme.header.logo_height || 50));
  let w = Math.round(theme.identity.logo_w || 0);
  if (w <= 0) w = ratio ? Math.round(hd * ratio) : theme.identity.logo_width || 146;
  w = Math.max(20, Math.min(600, w));
  return { w, h: ratio ? Math.round(w / ratio) : 0, wm: Math.max(20, Math.round((w * 40) / hd)) };
}
