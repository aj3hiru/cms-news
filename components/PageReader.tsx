import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedPageBySlug } from "@/lib/pages";
import { getSiteContext } from "@/lib/theme/site";
import { getSeoSettings, formatTitle } from "@/lib/seo/settings";
import { applyShortcodes, applyShortcodesText } from "@/lib/shortcodes";
import { RichContent } from "@/components/shortcodes/RichContent";
import { LOCALE } from "@/lib/i18n/public";
import { TrendingSidebar } from "@/components/theme/TrendingSidebar";
import { resolveSiteConfig } from "@/lib/config";
import { staticPagePath } from "@/lib/urls";
import { ListingAds } from "@/components/shared/ListingAds";
import { injectParagraphAds } from "@/lib/adRendering";

export async function buildPageMetadata(slug: string): Promise<Metadata> {
  const page = await getPublishedPageBySlug(slug);
  if (!page) return {};
  const [siteConfig, ctx, seo] = await Promise.all([resolveSiteConfig(""), getSiteContext(), getSeoSettings()]);
  const title = applyShortcodesText(page.metaTitle || formatTitle(seo.page_title_format, { title: page.title, sitename: ctx.siteName, sep: seo.separator }), ctx.sc);
  const description = page.metaDescription || undefined;
  const url = staticPagePath(slug);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: LOCALE[ctx.lang].og, title, description, url, siteName: siteConfig.siteName, images: [{ url: siteConfig.seoDefaultImage }] },
    twitter: { card: "summary_large_image", title, description, images: [siteConfig.seoDefaultImage] },
  };
}

export async function PageReader({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const page = await getPublishedPageBySlug(slug, preview);
  if (!page) notFound();
  const ctx = await getSiteContext();

  const withSidebar = ctx.theme.sidebar.on_page;
  const body = (
    <>
      <ListingAds page="page" position="before_post" />
      {preview && (
        <div className="nb-preview-bar">Preview — this page is not live yet</div>
      )}
      <h1 className="nb-page-title">{page.title}</h1>

      <ListingAds page="page" position="before_content" />

      <RichContent html={await injectParagraphAds("page", applyShortcodes(page.content ?? "", ctx.sc))} className="entry-content" />

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
