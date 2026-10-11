import type { Metadata } from "next";
import { getSiteContext } from "./site";
import { getSeoSettings, seoTitle, formatDescription } from "../seo/settings";
import { resolveMediaUrl } from "../urls";
import { resolveSiteConfig } from "../config";
import { LOCALE } from "../i18n/public";
import { robotsMeta, alternatesWithFeed } from "../seo/meta";

/**
 * Title / description / canonical / robots for archive pages, from SEO → Titles & Meta (Categories, Tags, Authors).
 * A category's own SEO title / description (Admin → Categories) wins over the templates, as in Rank Math.
 */
export async function archiveMetadata(opts: {
  kind: "category" | "tag" | "author";
  term: string;
  ownTitle?: string | null;
  ownDescription?: string | null;
  /** category / tag description, or the author's bio */
  termDescription?: string | null;
  path: string;
  page: number;
  noindex?: boolean;
}): Promise<Metadata> {
  const [ctx, seo, cfg] = await Promise.all([getSiteContext(), getSeoSettings(), resolveSiteConfig("")]);
  const td = (opts.termDescription ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  const vars = { term: opts.term, title: opts.term, name: opts.term, sitename: ctx.siteName, sep: seo.separator, page: opts.page, term_description: td, user_description: td };
  const tpl = opts.kind === "category" ? seo.archive_title_format : opts.kind === "tag" ? seo.tag_title_format : seo.author_title_format;
  const descTpl = opts.kind === "category" ? seo.category_description_format : opts.kind === "tag" ? seo.tag_description_format : seo.author_description_format;
  let title = seoTitle(seo, opts.ownTitle?.trim() || tpl, vars);
  // the %page% variable adds "Page 2" itself; templates without it still get it
  if (opts.page > 1 && !/%page%/.test(opts.ownTitle?.trim() || tpl)) title += ` ${seo.separator} Page ${opts.page}`;
  const description = opts.ownDescription?.trim() || formatDescription(descTpl, vars) || `Latest posts in ${opts.term} on ${ctx.siteName}.`;
  const url = opts.page > 1 ? `${opts.path}?page=${opts.page}` : opts.path;
  const image = seo.default_og_image ? resolveMediaUrl(seo.default_og_image) : cfg.seoDefaultImage;
  const typeNoindex = opts.kind === "category" ? seo.noindex_categories : opts.kind === "tag" ? seo.noindex_tags : seo.noindex_authors;
  return {
    title: { absolute: title },
    description,
    alternates: alternatesWithFeed(url, ctx.siteName),
    robots: robotsMeta(seo, Boolean(opts.noindex || typeNoindex || (opts.page > 1 && seo.noindex_paginated))),
    openGraph: { type: opts.kind === "author" ? "profile" : "website", locale: LOCALE[ctx.lang].og, title, description, url, siteName: ctx.siteName, images: [{ url: image }] },
    twitter: { card: seo.twitter_card, title, description, images: [image] },
  };
}
