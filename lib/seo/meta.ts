import type { Metadata } from "next";
import type { SeoSettings } from "./settings";

/**
 * Robots meta for a page. Every page passes a full value — a page that sets `robots: undefined`
 * replaces the layout's tag with nothing (Next merges metadata per key).
 *   index → "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" (as Yoast)
 */
export function robotsMeta(seo: Pick<SeoSettings, "max_image_preview">, noindex = false): Metadata["robots"] {
  if (noindex) return { index: false, follow: true };
  return { index: true, follow: true, "max-image-preview": seo.max_image_preview, "max-snippet": -1, "max-video-preview": -1 };
}

/** `alternates` with the canonical plus the site RSS feed (a page's canonical would otherwise drop the layout's feed link). */
export function alternatesWithFeed(canonical: string, siteName: string, extraFeeds: { url: string; title: string }[] = []): Metadata["alternates"] {
  return { canonical, types: { "application/rss+xml": [{ url: "/feed", title: `${siteName} » Feed` }, ...extraFeeds] } };
}
