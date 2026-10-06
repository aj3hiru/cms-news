import type { Metadata } from "next";
import { getSiteContext } from "./site";
import { getSeoSettings, formatTitle } from "../seo/settings";
import { resolveMediaUrl } from "../urls";
import { resolveSiteConfig } from "../config";

/** Title / description / canonical / robots for archive pages, from SEO settings. */
export async function archiveMetadata(opts: { term: string; description?: string | null; path: string; page: number; noindex?: boolean }): Promise<Metadata> {
  const [ctx, seo, cfg] = await Promise.all([getSiteContext(), getSeoSettings(), resolveSiteConfig("")]);
  let title = formatTitle(seo.archive_title_format, { term: opts.term, sitename: ctx.siteName, sep: seo.separator });
  if (opts.page > 1) title += ` ${seo.separator} Page ${opts.page}`;
  const description = opts.description?.trim() || `Latest posts in ${opts.term} on ${ctx.siteName}.`;
  const url = opts.page > 1 ? `${opts.path}?page=${opts.page}` : opts.path;
  const image = seo.default_og_image ? resolveMediaUrl(seo.default_og_image) : cfg.seoDefaultImage;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: opts.noindex || (opts.page > 1 && seo.noindex_paginated) ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", title, description, url, siteName: ctx.siteName, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
