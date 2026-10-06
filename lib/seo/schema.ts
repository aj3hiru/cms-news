import type { PostDetail } from "../postDetail";
import type { SiteContext } from "../theme/site";
import { resolveMediaUrl, categoryUrl, authorUrl } from "../urls";
import type { SeoSettings } from "./settings";
import type { ImageInfo } from "./imageSize";

const abs = (base: string, u: string) => (/^https?:\/\//i.test(u) ? u : `${base.replace(/\/+$/, "")}${u.startsWith("/") ? "" : "/"}${u}`);
const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().replace(/\.\d{3}Z$/, "+00:00") : undefined);

/** Logo used for the publisher: SEO logo → header logo → site icon. */
export function publisherLogoPath(ctx: SiteContext, seo: SeoSettings, siteIcon?: string): string {
  return seo.org_logo || ctx.logo || siteIcon || "";
}

/** Publisher (organization or person) shared by every page's schema. */
export function publisherNode(ctx: SiteContext, seo: SeoSettings, logo?: { path: string; info: ImageInfo | null }) {
  const base = ctx.siteUrl;
  const sameAs = [seo.facebook_url, seo.twitter_username ? `https://x.com/${seo.twitter_username.replace(/^@/, "")}` : "", ...seo.same_as.split(/\s+/)]
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s));
  const logoPath = logo?.path || publisherLogoPath(ctx, seo);
  const logoUrl = logoPath ? abs(base, resolveMediaUrl(logoPath)) : "";
  const logoNode = logoUrl
    ? {
        "@type": "ImageObject",
        "@id": `${base}/#/schema/logo/image/`,
        inLanguage: ctx.locale,
        url: logoUrl,
        contentUrl: logoUrl,
        ...(logo?.info ? { width: logo.info.width, height: logo.info.height } : {}),
        caption: seo.org_name || ctx.siteName,
      }
    : null;
  if (seo.represents === "person") {
    return {
      "@type": ["Person", "Organization"],
      "@id": `${base}/#person`,
      name: seo.person_name || ctx.siteName,
      url: `${base}/`,
      ...(logoNode ? { image: logoNode, logo: { "@id": logoNode["@id"] } } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    };
  }
  return {
    "@type": seo.org_type || "Organization",
    "@id": `${base}/#organization`,
    name: seo.org_name || ctx.siteName,
    url: `${base}/`,
    ...(logoNode ? { logo: logoNode, image: { "@id": logoNode["@id"] } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** WebSite node with the sitelinks search box. */
export function websiteNode(ctx: SiteContext, publisherId: string) {
  const base = ctx.siteUrl;
  return {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: `${base}/`,
    name: ctx.siteName,
    ...(ctx.tagline ? { description: ctx.tagline } : {}),
    publisher: { "@id": publisherId },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${base}/search?q={search_term_string}` },
        "query-input": { "@type": "PropertyValueSpecification", valueRequired: true, valueName: "search_term_string" },
      },
    ],
    inLanguage: ctx.locale,
  };
}

export function buildPostSchema({
  post,
  ctx,
  seo,
  faq,
  url,
  description,
  image,
  logo,
  wordCount,
  commentCount,
  comments,
}: {
  post: PostDetail;
  ctx: SiteContext;
  seo: SeoSettings;
  faq: { q: string; a: string }[];
  url: string;
  description: string;
  /** Featured (or default share) image with its real size. */
  image: { path: string; info: ImageInfo | null } | null;
  logo: { path: string; info: ImageInfo | null };
  wordCount: number;
  commentCount: number;
  /** Comments are open on this post. */
  comments: boolean;
}) {
  const base = ctx.siteUrl;
  const type = post.seo.schemaType || seo.default_schema || "NewsArticle";
  const publisher = publisherNode(ctx, seo, logo);
  const imgUrl = image ? abs(base, resolveMediaUrl(image.path)) : "";
  const imgId = `${url}#primaryimage`;
  const crumbId = `${url}#breadcrumb`;
  const published = iso(post.date);
  const modified = iso(post.updatedAt ?? post.date);
  const authorId = `${base}/#/schema/person/${post.authorId}`;
  const authorPage = post.authorSlug ? abs(base, authorUrl(post.authorSlug)) : undefined;
  const authorSameAs = Object.values(post.authorSocials ?? {}).filter((s): s is string => Boolean(s && /^https?:\/\//.test(s)));
  const authorImg = post.authorProfileImage ? abs(base, resolveMediaUrl(post.authorProfileImage)) : "";
  const keywords = post.tags.length ? post.tags.map((t) => t.name) : post.seo.focusKeyword ? [post.seo.focusKeyword] : [];
  const graph: Record<string, unknown>[] = [];

  if (type !== "WebPage") {
    graph.push({
      "@type": type,
      "@id": `${url}#article`,
      isPartOf: { "@id": url },
      author: { name: post.authorName, "@id": authorId },
      headline: post.title.slice(0, 110),
      description,
      datePublished: published,
      dateModified: modified,
      mainEntityOfPage: { "@id": url },
      wordCount,
      commentCount,
      ...(seo.publisher_schema ? { publisher: { "@id": publisher["@id"] } } : {}),
      ...(imgUrl ? { image: { "@id": imgId }, thumbnailUrl: imgUrl } : {}),
      ...(keywords.length ? { keywords } : {}),
      articleSection: [post.categoryName],
      inLanguage: ctx.locale,
      ...(comments ? { potentialAction: [{ "@type": "CommentAction", name: "Comment", target: [`${url}#comment-form`] }] } : {}),
    });
  }

  graph.push({
    "@type": "WebPage",
    "@id": url,
    url,
    name: post.seo.title || post.title,
    isPartOf: { "@id": `${base}/#website` },
    ...(imgUrl ? { primaryImageOfPage: { "@id": imgId }, image: { "@id": imgId }, thumbnailUrl: imgUrl } : {}),
    datePublished: published,
    dateModified: modified,
    description,
    ...(seo.breadcrumbs_schema ? { breadcrumb: { "@id": crumbId } } : {}),
    inLanguage: ctx.locale,
    potentialAction: [{ "@type": "ReadAction", target: [url] }],
  });

  if (imgUrl) {
    graph.push({
      "@type": "ImageObject",
      "@id": imgId,
      inLanguage: ctx.locale,
      url: imgUrl,
      contentUrl: imgUrl,
      ...(image?.info ? { width: image.info.width, height: image.info.height } : {}),
      caption: post.bannerAlt || post.title,
    });
  }

  if (seo.breadcrumbs_schema) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": crumbId,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: ctx.t.home, item: `${base}/` },
        { "@type": "ListItem", position: 2, name: post.categoryName, item: abs(base, categoryUrl(post.categorySlug)) },
        { "@type": "ListItem", position: 3, name: post.title },
      ],
    });
  }

  graph.push(websiteNode(ctx, publisher["@id"] as string));
  graph.push(publisher);

  graph.push({
    "@type": "Person",
    "@id": authorId,
    name: post.authorName,
    ...(authorImg
      ? { image: { "@type": "ImageObject", "@id": `${base}/#/schema/person/image/${post.authorId}`, inLanguage: ctx.locale, url: authorImg, contentUrl: authorImg, caption: post.authorName } }
      : {}),
    ...(post.authorBio ? { description: post.authorBio.replace(/<[^>]+>/g, "").trim().slice(0, 300) } : {}),
    ...(authorSameAs.length ? { sameAs: authorSameAs } : {}),
    ...(authorPage ? { url: authorPage } : {}),
  });

  if (seo.faq_schema && faq.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
