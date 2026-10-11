import fs from "fs";
import { prisma } from "./db";
import { resolveSiteConfig, getAppConfig } from "./config";
import { postUrl, resolveMediaUrl, categoryUrl, tagUrl, authorUrl, staticPagePath } from "./urls";
import { resolveLocalPath } from "./localStorage";
import { getSeoSettings, type SeoSettings } from "./seo/settings";

/**
 * RSS feed and XML sitemaps, laid out like a WordPress site's
 * (/feed/, /sitemap.xml index → posts / pages / categories / tags /
 * authors / news). Each sitemap carries an XSL stylesheet so it reads as a
 * table in a browser; search engines ignore the stylesheet.
 */

export const SITEMAP_PAGE_SIZE = 1000;

export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function iso(d: Date | null | undefined): string {
  return (d ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

async function site() {
  const [cfg, app] = await Promise.all([resolveSiteConfig(""), getAppConfig()]);
  const base = cfg.siteUrl.replace(/\/+$/, "");
  const lang = (app.site_language || "en").trim() || "en";
  const abs = (p: string) => (/^https?:\/\//i.test(p) ? p : `${base}${p.startsWith("/") ? "" : "/"}${p}`);
  const favicon = app.site_favicon?.trim() ? abs(resolveMediaUrl(app.site_favicon.trim())) : null;
  return { cfg, base, lang, abs, favicon };
}

function imageType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return { png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", avif: "image/avif" }[ext] ?? "image/jpeg";
}

function fileSize(storedPath: string): number {
  try {
    const abs = resolveLocalPath(storedPath);
    return abs ? fs.statSync(abs).size : 0;
  } catch {
    return 0;
  }
}

function excerptOf(excerpt: string | null, content: string, max = 300): string {
  const text = (excerpt?.trim() || content.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")} [&#8230;]` : text;
}

// ── RSS ────────────────────────────────────────────────────────────────────

export async function buildRssFeed(selfPath: string, limit = 100): Promise<string> {
  const { cfg, base, lang, abs, favicon } = await site();
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      date: true,
      updatedAt: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
      postCategories: { select: { category: { select: { name: true } } } },
      postTags: { select: { tag: { select: { name: true } } } },
      featuredImage: { select: { filePath: true, altText: true } },
      _count: { select: { comments: { where: { status: "approved", hidden: false } } } },
    },
  });
  const lastBuild = posts.reduce<Date>((m, p) => {
    const d = p.updatedAt ?? p.date;
    return d && d > m ? d : m;
  }, new Date(0));

  const items = posts
    .map((p) => {
      const link = `${base}${postUrl(p.slug)}`;
      const cats = [...new Set([p.category.name, ...p.postCategories.map((c) => c.category.name), ...p.postTags.map((t) => t.tag.name)])];
      const img = p.featuredImage?.filePath ? abs(resolveMediaUrl(p.featuredImage.filePath)) : null;
      const imgType = img ? imageType(img) : "";
      const lead = img ? `<p><img src="${xmlEscape(img)}" alt="${xmlEscape(p.featuredImage?.altText || p.title)}" /></p>` : "";
      return `	<item>
		<title>${xmlEscape(p.title)}</title>
		<link>${xmlEscape(link)}</link>
		<comments>${xmlEscape(link)}#comments</comments>
		<dc:creator>${cdata(p.author?.name ?? cfg.siteName)}</dc:creator>
		<pubDate>${(p.date ?? new Date()).toUTCString()}</pubDate>
${cats.map((c) => `		<category>${cdata(c)}</category>`).join("\n")}
		<guid isPermaLink="true">${xmlEscape(link)}</guid>
		<description>${cdata(excerptOf(p.excerpt, p.content))}</description>
		<content:encoded>${cdata(lead + p.content)}</content:encoded>
		<slash:comments>${p._count.comments}</slash:comments>${
          img
            ? `
		<enclosure url="${xmlEscape(img)}" length="${fileSize(p.featuredImage!.filePath)}" type="${imgType}" />
		<media:content url="${xmlEscape(img)}" medium="image" type="${imgType}">
			<media:title type="plain">${xmlEscape(p.featuredImage?.altText || p.title)}</media:title>
		</media:content>
		<media:thumbnail url="${xmlEscape(img)}" />`
            : ""
        }
	</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:wfw="http://wellformedweb.org/CommentAPI/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
	xmlns:slash="http://purl.org/rss/1.0/modules/slash/"
	xmlns:media="http://search.yahoo.com/mrss/"
	>

<channel>
	<title>${xmlEscape(cfg.siteName)}</title>
	<atom:link href="${xmlEscape(base + selfPath)}" rel="self" type="application/rss+xml" />
	<link>${xmlEscape(base)}/</link>
	<description>${xmlEscape(cfg.siteTagline || cfg.seoDefaultDescription || "")}</description>
	<lastBuildDate>${(lastBuild.getTime() ? lastBuild : new Date()).toUTCString()}</lastBuildDate>
	<language>${xmlEscape(lang)}</language>
	<sy:updatePeriod>hourly</sy:updatePeriod>
	<sy:updateFrequency>1</sy:updateFrequency>
	<generator>${xmlEscape(base)}</generator>${
    favicon
      ? `
	<image>
		<url>${xmlEscape(favicon)}</url>
		<title>${xmlEscape(cfg.siteName)}</title>
		<link>${xmlEscape(base)}/</link>
	</image>`
      : ""
  }
${items}
</channel>
</rss>
`;
}

/** Atom feed in WordPress's format (/feed/atom). */
export async function buildAtomFeed(limit = 100): Promise<string> {
  const { cfg, base, lang } = await site();
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      date: true,
      updatedAt: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
      postTags: { select: { tag: { select: { name: true } } } },
      _count: { select: { comments: { where: { status: "approved", hidden: false } } } },
    },
  });
  const updated = posts.reduce<Date>((m, p) => {
    const d = p.updatedAt ?? p.date;
    return d && d > m ? d : m;
  }, new Date(0));
  const z = (d: Date | null | undefined) => (d ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  const entries = posts
    .map((p) => {
      const link = `${base}${postUrl(p.slug)}`;
      const cats = [...new Set([p.category.name, ...p.postTags.map((t) => t.tag.name)])];
      return `	<entry>
		<author>
			<name>${xmlEscape(p.author?.name ?? cfg.siteName)}</name>
		</author>

		<title type="html">${cdata(p.title)}</title>
		<link rel="alternate" type="text/html" href="${xmlEscape(link)}" />

		<id>${xmlEscape(`${base}/?p=${p.id}`)}</id>
		<updated>${z(p.updatedAt ?? p.date)}</updated>
		<published>${z(p.date)}</published>
${cats.map((c) => `		<category scheme="${xmlEscape(base)}" term="${xmlEscape(c)}" />`).join("\n")}

		<summary type="html">${cdata(excerptOf(p.excerpt, p.content))}</summary>

		<content type="html" xml:base="${xmlEscape(link)}">${cdata(p.content)}</content>
		<link rel="replies" type="text/html" href="${xmlEscape(link)}#comments" thr:count="${p._count.comments}" />
		<thr:total>${p._count.comments}</thr:total>
	</entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?><feed
	xmlns="http://www.w3.org/2005/Atom"
	xmlns:thr="http://purl.org/syndication/thread/1.0"
	xml:lang="${xmlEscape(lang)}"
	>
	<title type="text">${xmlEscape(cfg.siteName)}</title>
	<subtitle type="text">${xmlEscape(cfg.siteTagline || cfg.seoDefaultDescription || "")}</subtitle>

	<updated>${z(updated.getTime() ? updated : new Date())}</updated>

	<link rel="alternate" type="text/html" href="${xmlEscape(base)}/" />
	<id>${xmlEscape(base)}/feed/atom</id>
	<link rel="self" type="application/atom+xml" href="${xmlEscape(base)}/feed/atom" />

	<generator uri="${xmlEscape(base)}/">${xmlEscape(cfg.siteName)}</generator>
${entries}
</feed>
`;
}

// ── Sitemaps (Rank Math layout) ────────────────────────────────────────────
//   /sitemap_index.xml → post-sitemap.xml (post-sitemap2.xml … per "Links Per Sitemap"), page-sitemap.xml,
//   category-sitemap.xml, post_tag-sitemap.xml, author-sitemap.xml and news-sitemap.xml, styled in a browser by
//   /main-sitemap.xsl and /news-sitemap.xsl. Options: SEO → Sitemap Settings.

const ids = (csv: string) => csv.split(/[\s,]+/).filter((x) => /^\d+$/.test(x)).map(Number);

async function smContext() {
  const [s, seo] = await Promise.all([site(), getSeoSettings()]);
  const host = s.base.replace(/^https?:/, "");
  return { ...s, seo, per: Math.max(10, Math.min(50000, seo.sm_per || 1000)), head: (xsl = "main") => `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="${xmlEscape(host)}/${xsl}-sitemap.xsl"?>\n` };
}

const footer = (siteName: string) => `\n<!-- XML Sitemap generated by ${xmlEscape(siteName).replace(/--/g, "-")} SEO -->`;

/** Posts that may appear: published, not "No Index", not excluded in Sitemap Settings. */
async function sitemapPostWhere(seo: SeoSettings) {
  const noindex = await prisma.postMeta.findMany({ where: { metaKey: "noindex", metaValue: "1" }, select: { postId: true } });
  const exclude = [...new Set([...ids(seo.sm_exclude_posts), ...noindex.map((n) => n.postId)])];
  return { status: "published" as const, ...(exclude.length ? { id: { notIn: exclude } } : {}) };
}

function smUrl(loc: string, lastmod: Date | null | undefined, images: string[] = []): string {
  return `\t<url>\n\t\t<loc>${xmlEscape(loc)}</loc>${lastmod ? `\n\t\t<lastmod>${iso(lastmod)}</lastmod>` : ""}${images
    .map((i) => `\n\t\t<image:image>\n\t\t\t<image:loc>${xmlEscape(i)}</image:loc>\n\t\t</image:image>`)
    .join("")}\n\t</url>`;
}

function smUrlset(head: string, entries: string[], siteName: string): string {
  return `${head}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>${footer(siteName)}`;
}

/** The sitemaps that exist right now, with their newest change. */
export async function sitemapList(): Promise<{ loc: string; lastmod: Date | null }[]> {
  const { base, seo, per } = await smContext();
  const out: { loc: string; lastmod: Date | null }[] = [];
  const where = await sitemapPostWhere(seo);
  const [postCount, latestPost, latestPage, latestTag, tagCount] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findFirst({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true, date: true } }),
    prisma.page.findFirst({ where: { status: "published" }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.tag.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.postTag.count({ where: { post: { status: "published" } } }),
  ]);
  const postMod = latestPost?.updatedAt ?? latestPost?.date ?? null;
  if (seo.sm_posts) {
    const files = Math.max(1, Math.ceil(postCount / per));
    for (let i = 1; i <= Math.min(files, 200); i++) out.push({ loc: `${base}/post-sitemap${i > 1 ? i : ""}.xml`, lastmod: postMod });
  }
  if (seo.sm_pages) out.push({ loc: `${base}/page-sitemap.xml`, lastmod: latestPage?.updatedAt && postMod && latestPage.updatedAt > postMod ? latestPage.updatedAt : postMod ?? latestPage?.updatedAt ?? null });
  if (seo.sm_categories && !seo.noindex_categories) out.push({ loc: `${base}/category-sitemap.xml`, lastmod: postMod });
  if (seo.sm_tags && !seo.noindex_tags && tagCount) out.push({ loc: `${base}/post_tag-sitemap.xml`, lastmod: latestTag?.updatedAt ?? postMod });
  if (seo.sm_authors && !seo.noindex_authors) out.push({ loc: `${base}/author-sitemap.xml`, lastmod: postMod });
  if (seo.news_sitemap) out.push({ loc: `${base}/news-sitemap.xml`, lastmod: postMod });
  return out;
}

export async function buildSitemapIndex(): Promise<string> {
  const { cfg, head } = await smContext();
  const list = await sitemapList();
  return `${head()}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${list.map((m) => `\t<sitemap>\n\t\t<loc>${xmlEscape(m.loc)}</loc>${m.lastmod ? `\n\t\t<lastmod>${iso(m.lastmod)}</lastmod>` : ""}\n\t</sitemap>`).join("\n")}
</sitemapindex>${footer(cfg.siteName)}`;
}

/** Images of a post for the sitemap: featured image (option) + images in the content on this site (option). */
function postImages(seo: SeoSettings, abs: (p: string) => string, base: string, featured: string | null | undefined, content: string): string[] {
  const out: string[] = [];
  if (seo.sm_featured && featured) out.push(abs(resolveMediaUrl(featured)));
  if (seo.sm_images) {
    for (const m of content.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)) {
      const src = m[1].startsWith("//") ? `https:${m[1]}` : abs(m[1]);
      if (src.startsWith(base) || /\/upload\//.test(src)) out.push(src);
    }
  }
  return [...new Set(out)].slice(0, 1000);
}

export async function buildPostsSitemap(page: number): Promise<string | null> {
  const { cfg, base, abs, seo, per, head } = await smContext();
  if (!seo.sm_posts) return null;
  const posts = await prisma.post.findMany({
    where: await sitemapPostWhere(seo),
    orderBy: { date: "desc" },
    skip: (page - 1) * per,
    take: per,
    select: { slug: true, date: true, updatedAt: true, content: seo.sm_images, featuredImage: { select: { filePath: true } } },
  });
  if (posts.length === 0 && page > 1) return null;
  return smUrlset(
    head(),
    posts.map((p) => smUrl(`${base}${postUrl(p.slug)}`, p.updatedAt ?? p.date, postImages(seo, abs, base, p.featuredImage?.filePath, (p as { content?: string }).content ?? ""))),
    cfg.siteName
  );
}

export async function buildPagesSitemap(): Promise<string | null> {
  const { cfg, base, seo, head } = await smContext();
  if (!seo.sm_pages) return null;
  const [pages, latestPost] = await Promise.all([
    prisma.page.findMany({ where: { status: "published" }, orderBy: { id: "asc" }, select: { slug: true, updatedAt: true } }),
    prisma.post.findFirst({ where: { status: "published" }, orderBy: { date: "desc" }, select: { date: true, updatedAt: true } }),
  ]);
  return smUrlset(
    head(),
    [
      smUrl(`${base}/`, latestPost?.updatedAt ?? latestPost?.date),
      smUrl(`${base}/categories`, latestPost?.updatedAt ?? latestPost?.date),
      ...pages.map((p) => smUrl(`${base}${staticPagePath(p.slug)}`, p.updatedAt)),
    ],
    cfg.siteName
  );
}

export async function buildCategoriesSitemap(): Promise<string | null> {
  const { cfg, base, seo, head } = await smContext();
  if (!seo.sm_categories || seo.noindex_categories) return null;
  const skip = ids(seo.sm_exclude_terms);
  const cats = await prisma.category.findMany({
    where: skip.length ? { id: { notIn: skip } } : {},
    select: { slug: true, posts: { where: { status: "published" }, orderBy: { date: "desc" }, take: 1, select: { date: true, updatedAt: true } } },
    orderBy: { name: "asc" },
  });
  return smUrlset(head(), cats.filter((c) => c.posts.length > 0).map((c) => smUrl(`${base}${categoryUrl(c.slug)}`, c.posts[0].updatedAt ?? c.posts[0].date)), cfg.siteName);
}

export async function buildTagsSitemap(): Promise<string | null> {
  const { cfg, base, seo, head } = await smContext();
  if (!seo.sm_tags || seo.noindex_tags) return null;
  const skip = ids(seo.sm_exclude_terms).map((n) => BigInt(n));
  const tags = await prisma.tag.findMany({
    where: skip.length ? { id: { notIn: skip } } : {},
    select: { id: true, slug: true, updatedAt: true, postTags: { where: { post: { status: "published" } }, take: 1, select: { postId: true } } },
    orderBy: { name: "asc" },
  });
  return smUrlset(head(), tags.filter((t) => t.postTags.length > 0).map((t) => smUrl(`${base}${tagUrl(t.slug, t.id)}`, t.updatedAt)), cfg.siteName);
}

export async function buildAuthorsSitemap(): Promise<string | null> {
  const { cfg, base, seo, head } = await smContext();
  if (!seo.sm_authors || seo.noindex_authors) return null;
  const authors = await prisma.author.findMany({
    where: { slug: { not: null }, posts: { some: { status: "published" } } },
    select: { slug: true, posts: { where: { status: "published" }, orderBy: { date: "desc" }, take: 1, select: { date: true, updatedAt: true } } },
  });
  return smUrlset(head(), authors.map((a) => smUrl(`${base}${authorUrl(a.slug!)}`, a.posts[0]?.updatedAt ?? a.posts[0]?.date)), cfg.siteName);
}

/** Google News (Rank Math format): articles from the last 2 days (max 1000), as Google requires. */
export async function buildNewsSitemap(): Promise<string> {
  const { cfg, base, lang, seo, head } = await smContext();
  const since = new Date(Date.now() - 2 * 86_400_000);
  const skipCats = ids(seo.news_exclude_cats);
  const where = await sitemapPostWhere(seo);
  const posts = await prisma.post.findMany({
    where: { ...where, date: { gte: since }, ...(skipCats.length ? { categoryId: { notIn: skipCats } } : {}) },
    orderBy: { date: "desc" },
    take: 1000,
    select: { slug: true, title: true, date: true },
  });
  const name = xmlEscape(seo.news_name.trim() || cfg.siteName);
  const language = xmlEscape((seo.news_language || lang).split(/[-_]/)[0].toLowerCase() || "en");
  return `${head("news")}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-news/0.9 http://www.google.com/schemas/sitemap-news/0.9/sitemap-news.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${posts
  .map(
    (p) => `\t<url>
\t\t<loc>${xmlEscape(`${base}${postUrl(p.slug)}`)}</loc>
\t\t<news:news>
\t\t\t<news:publication>
\t\t\t\t<news:name>${name}</news:name>
\t\t\t\t<news:language>${language}</news:language>
\t\t\t</news:publication>
\t\t\t<news:publication_date>${iso(p.date)}</news:publication_date>
\t\t\t<news:title>${cdata(p.title)}</news:title>
\t\t</news:news>
\t</url>`
  )
  .join("\n")}
</urlset>${footer(cfg.siteName)}`;
}

export function xmlResponse(body: string, type = "application/xml"): Response {
  return new Response(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}

/** Browser view of the sitemaps (search engines ignore it) — the same page Rank Math shows. */
export async function sitemapXsl(news = false): Promise<string> {
  const { cfg, base } = await site();
  const domain = xmlEscape(base.replace(/^https?:\/\//, "").replace(/^www\./, ""));
  const index = xmlEscape(`${base}/sitemap_index.xml`);
  const home = xmlEscape(`${base}/`);
  const style = `
					body{font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif;margin:0;color:#545353}
					a{color:#05809e;text-decoration:none}
					h1{font-size:24px;font-family:Verdana,Geneva,sans-serif;font-weight:normal;margin:0}
					#description{background-color:#4275f4;color:#fff;padding:30px 30px 20px}
					#description h1,#description p,#description a{color:#fff;margin:0;font-size:1.1em}
					#description h1{font-size:2em;margin-bottom:1em}
					#description p{margin-top:5px}
					#description a{border-bottom:1px dotted}
					#content{padding:20px 30px;background:#fff;max-width:75%;margin:0 auto}
					table{border:none;border-collapse:collapse;font-size:.9em;width:100%}
					th{background-color:#4275f4;color:#fff;text-align:left;padding:15px 10px;font-size:14px;cursor:pointer}
					td{padding:10px;border-bottom:1px solid #ddd}
					tbody tr:nth-child(even){background-color:#f7f7f7}
					table td a{display:block}
					table td a img{max-height:30px;margin:6px 3px}
					@media (max-width:760px){#content{max-width:100%;padding:16px}#description{padding:22px 16px 14px}}`;
  const intro = `
				<div id="description">
					<h1>XML Sitemap</h1>
					<p>This XML Sitemap is generated by <a href="${home}" target="_blank">${domain}</a>. It is what search engines like Google use to crawl and re-crawl posts/pages/products/images/archives on your website.</p>
					<p>Learn more about <a href="http://sitemaps.org" target="_blank">XML Sitemaps</a>.</p>
				</div>`;
  const date = (f: string, n = 5) => `<xsl:value-of select="concat(substring(${f},0,11),concat(' ', substring(${f},12,${n})),concat(' ', substring(${f},20,6)))"/>`;
  const content = news
    ? `
				<div id="content">
					<p>This XML Sitemap contains <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs.</p>
					<p class="expl"><a href="${index}">&#8592; Sitemap Index</a></p>
					<table id="sitemap" cellpadding="3">
						<thead><tr><th width="40%">Title</th><th width="15%">Publication Date</th></tr></thead>
						<tbody>
							<xsl:for-each select="sitemap:urlset/sitemap:url">
								<tr>
									<td><xsl:variable name="itemURL"><xsl:value-of select="sitemap:loc"/></xsl:variable><a href="{$itemURL}"><xsl:value-of select="news:news/news:title"/></a></td>
									<td>${date("news:news/news:publication_date", 8)}</td>
								</tr>
							</xsl:for-each>
						</tbody>
					</table>
				</div>`
    : `
				<div id="content">
					<xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &gt; 0">
						<p>This XML Sitemap Index file contains <strong><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></strong> sitemaps.</p>
						<table id="sitemap" cellpadding="3">
							<thead><tr><th width="75%">Sitemap</th><th width="25%">Last Modified</th></tr></thead>
							<tbody>
								<xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
									<xsl:variable name="sitemapURL"><xsl:value-of select="sitemap:loc"/></xsl:variable>
									<tr>
										<td><a href="{$sitemapURL}"><xsl:value-of select="sitemap:loc"/></a></td>
										<td>${date("sitemap:lastmod")}</td>
									</tr>
								</xsl:for-each>
							</tbody>
						</table>
					</xsl:if>
					<xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &lt; 1">
						<p>This XML Sitemap contains <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs.</p>
						<p class="expl"><a href="${index}">&#8592; Sitemap Index</a></p>
						<table id="sitemap" cellpadding="3">
							<thead><tr><th width="75%">URL</th><th width="5%">Images</th><th title="Last Modification Time" width="20%">Last Mod.</th></tr></thead>
							<tbody>
								<xsl:for-each select="sitemap:urlset/sitemap:url">
									<tr>
										<td><xsl:variable name="itemURL"><xsl:value-of select="sitemap:loc"/></xsl:variable><a href="{$itemURL}"><xsl:value-of select="sitemap:loc"/></a></td>
										<td><xsl:value-of select="count(image:image)"/></td>
										<td>${date("sitemap:lastmod")}</td>
									</tr>
								</xsl:for-each>
							</tbody>
						</table>
					</xsl:if>
				</div>`;
  return `<?xml version="1.0" encoding="UTF-8"?><xsl:stylesheet version="2.0"
	xmlns:html="http://www.w3.org/TR/REC-html40"
	xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
	xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
	xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
	<xsl:template match="/">
		<html xmlns="http://www.w3.org/1999/xhtml">
			<head>
				<title>XML Sitemap - ${xmlEscape(cfg.siteName)}</title>
				<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
				<meta name="robots" content="noindex,follow" />
				<style type="text/css">${style}
				</style>
			</head>
			<body>${intro}${content}
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
`;
}

/** Older stylesheet address (/sitemap.xsl) — the same design. */
export const sitemapXslLegacy = () => sitemapXsl(false);
