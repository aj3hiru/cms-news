import "server-only";
import { prisma } from "../db";
import { resolveSiteConfig } from "../config";
import { loadSeoSettingsFresh } from "./settings";
import { sitemapList } from "../seoFeeds";

export type CheckState = "ok" | "warn" | "bad" | "info";

export interface SeoCheck {
  id: string;
  group: "Basic SEO" | "Advanced SEO" | "Performance & Security" | "Content";
  state: CheckState;
  title: string;
  detail: string;
  fix?: { label: string; href: string };
}

/** SEO → SEO Analyzer: site-wide checks like Rank Math's analyzer, from this site's own data. */
export async function runSeoAnalyzer(): Promise<{ checks: SeoCheck[]; score: number; ranAt: string }> {
  const [seo, cfg] = await Promise.all([loadSeoSettingsFresh(), resolveSiteConfig("")]);
  const checks: SeoCheck[] = [];
  const many = (x: number, one: string, more: string) => `${x} ${x === 1 ? one : more}`;
  const add = (c: SeoCheck) => checks.push(c);

  // ── Basic SEO
  add(
    seo.noindex_site
      ? { id: "visible", group: "Basic SEO", state: "bad", title: "Search engines are discouraged", detail: "Every page has noindex — Google will drop the whole site.", fix: { label: "Turn it off", href: "/admin/seo/titles?tab=global" } }
      : { id: "visible", group: "Basic SEO", state: "ok", title: "Site is visible to search engines", detail: "Pages are sent with index, follow." }
  );
  const homeTitle = seo.home_title.trim();
  add({
    id: "home-meta",
    group: "Basic SEO",
    state: homeTitle && (seo.home_description.trim() || cfg.seoDefaultDescription) ? "ok" : "warn",
    title: "Homepage title and description",
    detail: homeTitle ? `Title: “${homeTitle}”.` : "No custom homepage title — the site name and tagline are used.",
    fix: { label: "Homepage settings", href: "/admin/seo/titles?tab=homepage" },
  });
  add({
    id: "tagline",
    group: "Basic SEO",
    state: cfg.siteTagline || cfg.seoDefaultDescription ? "ok" : "warn",
    title: "Site tagline / default description",
    detail: cfg.siteTagline || cfg.seoDefaultDescription || "Empty — pages without their own description have none.",
    fix: { label: "General Settings", href: "/admin/general-settings" },
  });
  add({
    id: "logo",
    group: "Basic SEO",
    state: seo.org_logo || cfg.siteLogo ? "ok" : "warn",
    title: "Logo for Google (Organization schema)",
    detail: seo.org_logo ? "Set in Titles & Meta → Local SEO." : cfg.siteLogo ? "The header logo is used." : "No logo — Google can’t show your brand logo.",
    fix: { label: "Set logo", href: "/admin/seo/titles?tab=local" },
  });
  add({
    id: "og",
    group: "Basic SEO",
    state: seo.default_og_image ? "ok" : "warn",
    title: "Default share image (OpenGraph thumbnail)",
    detail: seo.default_og_image ? "Used when a post has no featured image." : "Posts without a featured image are shared with no picture.",
    fix: { label: "Set image", href: "/admin/seo/titles?tab=global" },
  });

  // ── Advanced SEO
  const maps = seo.m_sitemap ? await sitemapList().catch(() => []) : [];
  add(
    seo.m_sitemap && maps.length
      ? { id: "sitemap", group: "Advanced SEO", state: "ok", title: "XML sitemap", detail: `/sitemap_index.xml lists ${many(maps.length, "sitemap", "sitemaps")}.` }
      : { id: "sitemap", group: "Advanced SEO", state: "bad", title: "XML sitemap", detail: seo.m_sitemap ? "The sitemap index is empty." : "The Sitemap module is off.", fix: { label: "Dashboard", href: "/admin/seo" } }
  );
  add({ id: "news", group: "Advanced SEO", state: seo.news_sitemap ? "ok" : "info", title: "Google News sitemap", detail: seo.news_sitemap ? "/news-sitemap.xml is on." : "Off — only needed for Google News publishers.", fix: { label: "News Sitemap", href: "/admin/seo/sitemap?tab=news" } });
  const blocksAll = /^\s*user-agent:\s*\*\s*$[\s\S]*?^\s*disallow:\s*\/\s*$/im.test(seo.robots_txt);
  add({ id: "robots", group: "Advanced SEO", state: blocksAll ? "bad" : "ok", title: "robots.txt", detail: blocksAll ? "Your robots.txt blocks every crawler from the whole site (Disallow: /)." : seo.robots_txt.trim() ? "Custom rules; sitemap lines are added." : "Default rules; sitemap lines are added.", fix: { label: "Edit robots.txt", href: "/admin/seo/general?tab=robots" } });
  add({ id: "gsc", group: "Advanced SEO", state: seo.google_verification ? "ok" : "warn", title: "Google Search Console verification", detail: seo.google_verification ? "Verification code is set." : "Not set (fine if the domain is verified by DNS).", fix: { label: "Webmaster Tools", href: "/admin/seo/general?tab=webmaster" } });
  add({ id: "bing", group: "Advanced SEO", state: seo.bing_verification ? "ok" : "info", title: "Bing Webmaster Tools verification", detail: seo.bing_verification ? "Verification code is set." : "Not set.", fix: { label: "Webmaster Tools", href: "/admin/seo/general?tab=webmaster" } });
  add({ id: "schema", group: "Advanced SEO", state: seo.m_schema ? "ok" : "warn", title: "Schema (structured data)", detail: seo.m_schema ? `Articles use ${seo.default_schema}; Organization, WebSite, Breadcrumb and FAQ schema are added.` : "The Schema module is off — no rich results.", fix: { label: "Dashboard", href: "/admin/seo" } });
  add({ id: "indexnow", group: "Advanced SEO", state: seo.m_instant_indexing ? "ok" : "info", title: "Instant Indexing (IndexNow)", detail: seo.m_instant_indexing ? "Bing / Yandex are told about new and updated posts at once." : "Off.", fix: { label: "Instant Indexing", href: "/admin/seo/indexing" } });

  // ── Performance & Security
  add({ id: "https", group: "Performance & Security", state: /^https:\/\//.test(cfg.siteUrl) ? "ok" : "bad", title: "Secure connection (HTTPS)", detail: cfg.siteUrl });

  // ── Content (published posts)
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    select: { id: true, title: true, slug: true, content: true, featuredImageId: true, postMeta: { where: { metaKey: { in: ["description", "focus_keyword", "seo_title", "noindex"] } }, select: { metaKey: true, metaValue: true } } },
    orderBy: { date: "desc" },
    take: 2000,
  });
  const n = posts.length;
  const meta = (p: (typeof posts)[number], k: string) => p.postMeta.find((m) => m.metaKey === k)?.metaValue?.trim() ?? "";
  const pct = (x: number) => (n ? Math.round((x * 100) / n) : 0);
  const list = (arr: typeof posts) => arr.slice(0, 5).map((p) => `“${p.title.slice(0, 60)}”`).join(", ") + (arr.length > 5 ? ` and ${arr.length - 5} more` : "");
  const state = (bad: number): CheckState => (bad === 0 ? "ok" : pct(bad) > 30 ? "bad" : "warn");

  const noDesc = posts.filter((p) => !meta(p, "description"));
  add({ id: "desc", group: "Content", state: state(noDesc.length), title: "Posts with a meta description", detail: noDesc.length ? `${noDesc.length} of ${n} posts have none: ${list(noDesc)}.` : `All ${n} posts have one.` });
  const noKw = posts.filter((p) => !meta(p, "focus_keyword"));
  add({ id: "kw", group: "Content", state: noKw.length === 0 ? "ok" : pct(noKw.length) > 50 ? "warn" : "info", title: "Posts with a focus keyword", detail: noKw.length ? `${noKw.length} of ${n} posts have none: ${list(noKw)}.` : `All ${n} posts have one.` });
  const noImg = posts.filter((p) => !p.featuredImageId);
  add({ id: "img", group: "Content", state: state(noImg.length), title: "Posts with a featured image", detail: noImg.length ? `${noImg.length} of ${n} posts have none (Google Discover needs a large image): ${list(noImg)}.` : `All ${n} posts have one.` });
  const longTitle = posts.filter((p) => (meta(p, "seo_title") || p.title).length > 70);
  add({ id: "titlelen", group: "Content", state: longTitle.length ? "warn" : "ok", title: "SEO titles of a good length", detail: longTitle.length ? `${many(longTitle.length, "title is", "titles are")} longer than 70 characters and get cut in results: ${list(longTitle)}.` : "All titles are 70 characters or shorter." });
  const seen = new Map<string, number>();
  for (const p of posts) seen.set(p.title.trim().toLowerCase(), (seen.get(p.title.trim().toLowerCase()) ?? 0) + 1);
  const dup = posts.filter((p) => (seen.get(p.title.trim().toLowerCase()) ?? 0) > 1);
  add({ id: "dup", group: "Content", state: dup.length ? "warn" : "ok", title: "Unique post titles", detail: dup.length ? `${many(dup.length, "post shares", "posts share")} a title with another post: ${list(dup)}.` : "No two posts have the same title." });
  const noAlt = posts.filter((p) => /<img(?![^>]*\balt=["'][^"']+["'])[^>]*>/i.test(p.content));
  add({
    id: "alt",
    group: "Content",
    state: noAlt.length === 0 ? "ok" : seo.m_image_seo && seo.img_alt_missing ? "info" : "warn",
    title: "Images have ALT text",
    detail: noAlt.length ? `${many(noAlt.length, "post has", "posts have")} images without ALT text${seo.m_image_seo && seo.img_alt_missing ? " (Image SEO adds the post title for them)" : ""}: ${list(noAlt)}.` : "Every image in the posts has ALT text.",
    fix: noAlt.length && !(seo.m_image_seo && seo.img_alt_missing) ? { label: "Image SEO", href: "/admin/seo/general?tab=images" } : undefined,
  });
  const longSlug = posts.filter((p) => p.slug.length > 75);
  add({ id: "slug", group: "Content", state: longSlug.length ? "warn" : "ok", title: "Short URLs", detail: longSlug.length ? `${many(longSlug.length, "post URL is", "post URLs are")} longer than 75 characters: ${list(longSlug)}.` : "All post URLs are 75 characters or shorter." });
  const noindex = posts.filter((p) => meta(p, "noindex") === "1");
  add({ id: "noindex", group: "Content", state: "info", title: "Posts hidden from search (No Index)", detail: noindex.length ? `${noindex.length}: ${list(noindex)}.` : "None." });

  const scored = checks.filter((c) => c.state !== "info");
  const score = scored.length ? Math.round((scored.reduce((a, c) => a + (c.state === "ok" ? 1 : c.state === "warn" ? 0.5 : 0), 0) * 100) / scored.length) : 100;
  return { checks, score, ranAt: new Date().toISOString() };
}
