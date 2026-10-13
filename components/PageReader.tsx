import { notFound } from "next/navigation";
import { fixContentMediaUrls } from "@/lib/urls";
import { robotsMeta, alternatesWithFeed, notFoundMetadata } from "@/lib/seo/meta";
import type { Metadata } from "next";
import { getPublishedPageBySlug } from "@/lib/pages";
import { getSiteContext } from "@/lib/theme/site";
import { getSeoSettings, seoTitle, formatDescription } from "@/lib/seo/settings";
import { applySeoContentFilter } from "@/lib/seo/contentFilter";
import { resolveMediaUrl } from "@/lib/urls";
import { applyShortcodes, applyShortcodesText } from "@/lib/shortcodes";
import { RichContent } from "@/components/shortcodes/RichContent";
import { LOCALE } from "@/lib/i18n/public";
import { TrendingSidebar } from "@/components/theme/TrendingSidebar";
import { resolveSiteConfig } from "@/lib/config";
import { staticPagePath } from "@/lib/urls";
import { ListingAds } from "@/components/shared/ListingAds";
import { injectParagraphAds } from "@/lib/adRendering";
import { PageSchema } from "@/components/seo/PageSchema";

export async function buildPageMetadata(slug: string): Promise<Metadata> {
  const page = await getPublishedPageBySlug(slug);
  if (!page) return notFoundMetadata();
  const [siteConfig, ctx, seo] = await Promise.all([resolveSiteConfig(""), getSiteContext(), getSeoSettings()]);
  const excerpt = (page.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  const vars = { title: page.title, sitename: ctx.siteName, sep: seo.separator, excerpt };
  const title = applyShortcodesText(page.metaTitle ? seoTitle(seo, page.metaTitle, vars) : seoTitle(seo, seo.page_title_format, vars), ctx.sc);
  const description = page.metaDescription?.trim() || formatDescription(seo.page_description_format, vars) || undefined;
  const url = staticPagePath(slug);
  const image = seo.default_og_image ? resolveMediaUrl(seo.default_og_image) : siteConfig.seoDefaultImage;
  return {
    title: { absolute: title },
    description,
    alternates: alternatesWithFeed(url, siteConfig.siteName),
    robots: robotsMeta(seo),
    openGraph: { type: "website", locale: LOCALE[ctx.lang].og, title, description, url, siteName: siteConfig.siteName, images: image ? [{ url: image }] : undefined },
    twitter: { card: seo.twitter_card, title, description, images: image ? [image] : undefined },
  };
}

export async function PageReader({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const page = await getPublishedPageBySlug(slug, preview);
  if (!page) notFound();
  const [ctx, seo] = await Promise.all([getSiteContext(), getSeoSettings()]);

  const withSidebar = ctx.theme.sidebar.on_page;
  const body = (
    <>
      <ListingAds page="page" position="before_post" />
      {preview && (
        <div className="nb-preview-bar">Preview — this page is not live yet</div>
      )}
      {!preview && (
        <PageSchema
          type={slug === "about-us" ? "AboutPage" : slug === "contact-us" ? "ContactPage" : "WebPage"}
          name={page.title}
          path={staticPagePath(slug)}
          description={page.metaDescription || page.content}
        />
      )}
      <h1 className="nb-page-title">{page.title}</h1>

      <ListingAds page="page" position="before_content" />

      <RichContent html={await injectParagraphAds("page", applySeoContentFilter(applyShortcodes(fixContentMediaUrls(page.content ?? ""), ctx.sc), seo, { title: page.title, host: ctx.siteUrl }))} className="entry-content" />

      <ListingAds page="page" position="after_content" />
      <ListingAds page="page" position="after_post" />
      <ListingAds page="page" position="footer" />
    </>
  );
  return withSidebar ? (
    <main className="nb-archive">
      <div className="nb-archive-layout">
        <div className="nb-page nb-page--in-layout">{body}</div>
        <TrendingSidebar />
      </div>
    </main>
  ) : (
    <main className="nb-page">{body}</main>
  );
}
