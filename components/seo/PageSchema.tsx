import { getSiteContext } from "@/lib/theme/site";
import { getSeoSettings } from "@/lib/seo/settings";
import { publisherNode, publisherLogoPath, websiteNode } from "@/lib/seo/schema";
import { getImageInfo } from "@/lib/seo/imageSize";
import { getAppConfig } from "@/lib/config";

type Crumb = { name: string; path: string };

/**
 * Schema for pages that are not posts: archives (category, tag, all categories) and static pages
 * (About, Contact, Privacy, custom pages). Page node + BreadcrumbList + WebSite + publisher, like Rank Math.
 * Off when SEO → Schema is switched off.
 */
export async function PageSchema({
  type,
  name,
  path,
  description,
  crumbs,
}: {
  type: "CollectionPage" | "WebPage" | "AboutPage" | "ContactPage";
  name: string;
  /** address of this page, e.g. /categories/job (with ?page=N on later pages) */
  path: string;
  description?: string | null;
  /** trail between Home and this page, e.g. [{ name: "Categories", path: "/categories" }] */
  crumbs?: Crumb[];
}) {
  const [ctx, seo] = await Promise.all([getSiteContext(), getSeoSettings()]);
  if (!seo.m_schema) return null;
  const base = ctx.siteUrl.replace(/\/+$/, "");
  const url = `${base}${path}`;
  const logoPath = publisherLogoPath(ctx, seo, (await getAppConfig()).site_favicon?.trim());
  const publisher = publisherNode(ctx, seo, { path: logoPath, info: await getImageInfo(logoPath) });
  const trail: Crumb[] = [{ name: ctx.t.home || "Home", path: "/" }, ...(crumbs ?? []), { name, path }];
  const desc = (description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": url,
        url,
        name,
        ...(desc ? { description: desc } : {}),
        isPartOf: { "@id": `${base}/#website` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        inLanguage: ctx.locale,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${base}${c.path === "/" ? "/" : c.path}` })),
      },
      websiteNode(ctx, publisher["@id"] as string),
      publisher,
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />;
}
