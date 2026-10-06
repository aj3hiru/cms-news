import type { Metadata } from "next";
import { getSiteContext } from "@/lib/theme/site";
import { getCardPosts } from "@/lib/theme/cards";
import { getSeoSettings, formatTitle } from "@/lib/seo/settings";
import { publisherNode } from "@/lib/seo/schema";
import { applyShortcodesText } from "@/lib/shortcodes";
import { resolveMediaUrl } from "@/lib/urls";
import { resolveSiteConfig } from "@/lib/config";
import { ArchiveView } from "@/components/theme/ArchiveView";

export const revalidate = 60;

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const [ctx, seo, cfg] = await Promise.all([getSiteContext(), getSeoSettings(), resolveSiteConfig("")]);
  let title = applyShortcodesText(seo.home_title, ctx.sc) || (ctx.tagline ? formatTitle("%sitename% %sep% %title%", { title: ctx.tagline, sitename: ctx.siteName, sep: seo.separator }) : ctx.siteName);
  if (page > 1) title += ` ${seo.separator} Page ${page}`;
  const description = applyShortcodesText(seo.home_description, ctx.sc) || cfg.seoDefaultDescription;
  const image = seo.default_og_image ? resolveMediaUrl(seo.default_og_image) : cfg.seoDefaultImage;
  const url = page > 1 ? `/?page=${page}` : "/";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, types: { "application/rss+xml": [{ url: "/feed", title: `${ctx.siteName} » Feed` }] } },
    robots: page > 1 && seo.noindex_paginated ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", title, description, url, siteName: ctx.siteName, images: [{ url: image, width: 1200, height: 630, alt: ctx.siteName }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function HomePage({ searchParams }: Props) {
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const [ctx, seo] = await Promise.all([getSiteContext(), getSeoSettings()]);
  const perPage = Math.max(2, Math.min(50, ctx.theme.archive.per_page));
  const { posts, totalPages } = await getCardPosts({ kind: "all" }, page, perPage);
  const home = `${ctx.siteUrl}/`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: ctx.siteName,
        url: home,
        ...(ctx.tagline ? { description: ctx.tagline } : {}),
        publisher: { "@id": publisherNode(ctx, seo)["@id"] },
        potentialAction: { "@type": "SearchAction", target: `${ctx.siteUrl}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
      },
      publisherNode(ctx, seo),
    ],
  };
  const heading = ctx.theme.archive.home_heading;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <ArchiveView
        adPage="homepage"
        posts={posts}
        page={page}
        totalPages={totalPages}
        href={(p) => (p > 1 ? `/?page=${p}` : "/")}
        head={
          heading ? (
            <header className="nb-archive-head">
              <h1>{applyShortcodesText(heading, ctx.sc)}</h1>
            </header>
          ) : (
            <h1 className="screen-reader-text">{ctx.siteName}</h1>
          )
        }
      />
    </>
  );
}
