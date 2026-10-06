import type { PostDetail } from "../postDetail";
import type { SiteContext } from "../theme/site";
import { resolveMediaUrl, categoryUrl, authorUrl } from "../urls";
import type { SeoSettings } from "./settings";

const abs = (base: string, u: string) => (/^https?:\/\//i.test(u) ? u : `${base.replace(/\/+$/, "")}${u.startsWith("/") ? "" : "/"}${u}`);

/** Publisher / site entity shared by every page's schema. */
export function publisherNode(ctx: SiteContext, seo: SeoSettings) {
  const base = ctx.siteUrl;
  const logo = seo.org_logo ? resolveMediaUrl(seo.org_logo) : ctx.logo;
  const sameAs = [seo.facebook_url, seo.twitter_username ? `https://x.com/${seo.twitter_username.replace(/^@/, "")}` : "", ...seo.same_as.split(/\s+/)]
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s));
  if (seo.represents === "person") {
    return { "@type": "Person", "@id": `${base}/#person`, name: seo.person_name || ctx.siteName, url: `${base}/`, ...(sameAs.length ? { sameAs } : {}) };
  }
  return {
    "@type": seo.org_type || "Organization",
    "@id": `${base}/#organization`,
    name: seo.org_name || ctx.siteName,
    url: `${base}/`,
    ...(logo ? { logo: { "@type": "ImageObject", url: abs(base, logo) } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function buildPostSchema({
  post,
  ctx,
  seo,
  faq,
  url,
  description,
}: {
  post: PostDetail;
  ctx: SiteContext;
  seo: SeoSettings;
  faq: { q: string; a: string }[];
  url: string;
  description: string;
}) {
  const base = ctx.siteUrl;
  const type = post.seo.schemaType || seo.default_schema || "NewsArticle";
  const image = post.bannerPath ? abs(base, resolveMediaUrl(post.bannerPath)) : seo.default_og_image ? abs(base, resolveMediaUrl(seo.default_og_image)) : undefined;
  const publisher = publisherNode(ctx, seo);
  const graph: Record<string, unknown>[] = [];

  graph.push({
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: post.title,
    isPartOf: { "@type": "WebSite", "@id": `${base}/#website`, url: `${base}/`, name: ctx.siteName, publisher: { "@id": publisher["@id"] } },
    ...(image ? { primaryImageOfPage: { "@type": "ImageObject", url: image } } : {}),
    inLanguage: "en",
  });

  if (type !== "WebPage") {
    graph.push({
      "@type": type,
      "@id": `${url}#article`,
      headline: post.title.slice(0, 110),
      description,
      ...(image ? { image: [image] } : {}),
      datePublished: post.date ? new Date(post.date).toISOString() : undefined,
      dateModified: (post.updatedAt ?? post.date) ? new Date((post.updatedAt ?? post.date)!).toISOString() : undefined,
      author: { "@type": "Person", name: post.authorName, ...(post.authorSlug ? { url: abs(base, authorUrl(post.authorSlug)) } : {}) },
      ...(seo.publisher_schema ? { publisher } : {}),
      mainEntityOfPage: { "@id": `${url}#webpage` },
      articleSection: post.categoryName,
      ...(post.tags.length ? { keywords: post.tags.map((t) => t.name).join(", ") } : post.seo.focusKeyword ? { keywords: post.seo.focusKeyword } : {}),
    });
  }

  if (seo.breadcrumbs_schema) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: post.categoryName, item: abs(base, categoryUrl(post.categorySlug)) },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    });
  }

  if (seo.faq_schema && faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
