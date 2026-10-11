import type { Metadata } from "next";
import type { SeoSettings } from "./settings";

export type RobotsOverride = { noindex?: boolean; nofollow?: boolean; noarchive?: boolean; noimageindex?: boolean; nosnippet?: boolean };

/**
 * Robots meta for a page (Titles & Meta → Global Meta, overridden per post / archive). Every page passes a full
 * value — a page that sets `robots: undefined` replaces the layout's tag with nothing (Next merges metadata per key).
 *   index → "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large" (as Rank Math)
 * "Discourage search engines" makes every page noindex.
 */
export function robotsMeta(
  seo: Pick<SeoSettings, "max_image_preview"> & Partial<Pick<SeoSettings, "noindex_site" | "robots_nofollow" | "robots_noarchive" | "robots_noimageindex" | "robots_nosnippet" | "max_snippet" | "max_video_preview">>,
  noindexOrOverride: boolean | RobotsOverride = false
): Metadata["robots"] {
  const o: RobotsOverride = typeof noindexOrOverride === "boolean" ? { noindex: noindexOrOverride } : noindexOrOverride;
  const follow = !(o.nofollow ?? seo.robots_nofollow ?? false);
  if (o.noindex || seo.noindex_site) return { index: false, follow };
  const nosnippet = o.nosnippet ?? seo.robots_nosnippet ?? false;
  return {
    index: true,
    follow,
    ...(o.noarchive ?? seo.robots_noarchive ? { noarchive: true } : {}),
    ...(o.noimageindex ?? seo.robots_noimageindex ? { noimageindex: true } : {}),
    ...(nosnippet ? { nosnippet: true } : { "max-snippet": seo.max_snippet ?? -1 }),
    "max-video-preview": seo.max_video_preview ?? -1,
    "max-image-preview": seo.max_image_preview,
  };
}

/** `alternates` with the canonical plus the site RSS feed (a page's canonical would otherwise drop the layout's feed link). */
export function alternatesWithFeed(canonical: string, siteName: string, extraFeeds: { url: string; title: string }[] = []): Metadata["alternates"] {
  return { canonical, types: { "application/rss+xml": [{ url: "/feed", title: `${siteName} » Feed` }, ...extraFeeds] } };
}

/** Metadata for a route that is about to show the 404 page: "404 Title" from Titles & Meta → Misc Pages. */
export async function notFoundMetadata(): Promise<Metadata> {
  const [{ getSeoSettings, seoTitle }, { resolveSiteConfig }] = await Promise.all([import("./settings"), import("../config")]);
  const [seo, cfg] = await Promise.all([getSeoSettings(), resolveSiteConfig("")]);
  return { title: { absolute: seoTitle(seo, seo.title_404 || "Page Not Found %sep% %sitename%", { sitename: cfg.siteName, sep: seo.separator }) }, robots: { index: false, follow: true } };
}
