import type { Metadata } from "next";
import { getSiteContext } from "@/lib/theme/site";
import { getCardPosts, getCardPostsRange } from "@/lib/theme/cards";
import { HOME_BATCH, HOME_FIRST } from "@/lib/theme/homeFeed";
import { getSeoSettings, formatTitle } from "@/lib/seo/settings";
import { publisherNode, publisherLogoPath, websiteNode } from "@/lib/seo/schema";
import { getImageInfo } from "@/lib/seo/imageSize";
import { applyShortcodesText } from "@/lib/shortcodes";
import { resolveMediaUrl } from "@/lib/urls";
import { resolveSiteConfig, getAppConfig } from "@/lib/config";
import { ArchiveView } from "@/components/theme/ArchiveView";
import { LOCALE } from "@/lib/i18n/public";
import { robotsMeta, alternatesWithFeed } from "@/lib/seo/meta";

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
    alternates: alternatesWithFeed(url, ctx.siteName),
    robots: robotsMeta(seo, page > 1 && seo.noindex_paginated),
    openGraph: { type: "website", locale: LOCALE[ctx.lang].og, title, description, url, siteName: ctx.siteName, images: [{ url: image, width: 1200, height: 630, alt: ctx.siteName }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function HomePage({ searchParams }: Props) {
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const [ctx, seo] = await Promise.all([getSiteContext(), getSeoSettings()]);
  // Featured layout: "Posts per page" posts, but only the first screen is sent now; the rest load on scroll.
  const featured = ctx.theme.archive.home_layout === "featured";
  const perPage = featured ? Math.max(4, Math.min(60, ctx.theme.archive.home_count)) : Math.max(2, Math.min(50, ctx.theme.archive.per_page));
  const first = Math.min(perPage, page === 1 ? HOME_FIRST : HOME_BATCH);
  const { posts, totalPages, total } = featured
    ? await getCardPostsRange({ kind: "all" }, (page - 1) * perPage, first).then((r) => ({ ...r, totalPages: Math.max(1, Math.ceil(r.total / perPage)) }))
    : await getCardPosts({ kind: "all" }, page, perPage);
  const home = `${ctx.siteUrl}/`;
  const logoPath = publisherLogoPath(ctx, seo, (await getAppConfig()).site_favicon?.trim());
  const publisher = publisherNode(ctx, seo, { path: logoPath, info: await getImageInfo(logoPath) });
  const homeTitle = applyShortcodesText(seo.home_title, ctx.sc) || ctx.siteName;
  const homeDesc = applyShortcodesText(seo.home_description, ctx.sc) || ctx.tagline;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": home,
        url: home,
        name: homeTitle,
        isPartOf: { "@id": `${home}#website` },
        about: { "@id": publisher["@id"] },
        ...(homeDesc ? { description: homeDesc } : {}),
        inLanguage: ctx.locale,
      },
      websiteNode(ctx, publisher["@id"] as string),
      publisher,
    ],
  };
  const heading = ctx.theme.archive.home_heading;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <ArchiveView
        sidebarOn="home"
        adPage="homepage"
        posts={posts}
        page={page}
        totalPages={totalPages}
        more={featured ? { page, perPage, total } : undefined}
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
