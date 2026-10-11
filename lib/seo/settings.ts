import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "../db";

export const SEO_KEY = "seo_settings";

export const SCHEMA_TYPES = {
  NewsArticle: "News Article",
  BlogPosting: "Blog Post",
  Article: "Article",
  Report: "Report",
  ScholarlyArticle: "Scholarly Article",
  TechArticle: "Tech Article",
  OpinionNewsArticle: "Opinion (News)",
  AnalysisNewsArticle: "Analysis (News)",
  ReviewNewsArticle: "Review (News)",
  HowTo: "How-To",
  WebPage: "Web Page (no article schema)",
} as const;
export type SchemaType = keyof typeof SCHEMA_TYPES;

export interface SeoSettings {
  configured: boolean;
  site_type: "news" | "blog" | "magazine" | "personal" | "business";
  represents: "organization" | "person";
  org_name: string;
  org_logo: string;
  org_type: "NewsMediaOrganization" | "Organization" | "OnlineBusiness";
  person_name: string;
  default_schema: SchemaType;
  separator: string;
  post_title_format: string;
  page_title_format: string;
  archive_title_format: string;
  home_title: string;
  home_description: string;
  default_og_image: string;
  facebook_url: string;
  twitter_username: string;
  same_as: string;
  noindex_tags: boolean;
  noindex_authors: boolean;
  noindex_paginated: boolean;
  noindex_empty_categories: boolean;
  breadcrumbs_schema: boolean;
  faq_schema: boolean;
  publisher_schema: boolean;
  google_verification: string;
  bing_verification: string;
  yandex_verification: string;
  pinterest_verification: string;
  max_image_preview: "large" | "standard" | "none";
  news_sitemap: boolean;
  redirect_404_enabled: boolean;
  redirect_404_url: string;

  // ── Rank Math-style options ──
  wizard_level: "easy" | "advanced";
  /** Modules (SEO → Dashboard). news_sitemap above is the News Sitemap module. */
  m_sitemap: boolean;
  m_schema: boolean;
  m_instant_indexing: boolean;
  m_image_seo: boolean;
  m_analyzer: boolean;
  m_role_manager: boolean;
  m_link_counter: boolean;
  // General → Links / Images
  nofollow_external: boolean;
  nofollow_image_links: boolean;
  external_blank: boolean;
  affiliate_prefix: string;
  img_alt_missing: boolean;
  img_title_missing: boolean;
  // General → Webmaster tools (extra), robots.txt, roles
  baidu_verification: string;
  norton_verification: string;
  robots_txt: string;
  role_editor_seo: boolean;
  role_author_seo: boolean;
  // Titles & Meta → Global
  robots_nofollow: boolean;
  robots_noarchive: boolean;
  robots_noimageindex: boolean;
  robots_nosnippet: boolean;
  max_snippet: number;
  max_video_preview: number;
  capitalize_titles: boolean;
  twitter_card: "summary_large_image" | "summary";
  noindex_site: boolean;
  // Social
  fb_author: string;
  fb_admin: string;
  fb_app_id: string;
  // Homepage
  home_og_title: string;
  home_og_description: string;
  home_og_image: string;
  // Authors / misc
  author_title_format: string;
  author_description_format: string;
  search_title_format: string;
  title_404: string;
  noindex_search: boolean;
  // Posts / pages / categories / tags
  post_description_format: string;
  page_description_format: string;
  category_description_format: string;
  noindex_categories: boolean;
  tag_title_format: string;
  tag_description_format: string;
  // Sitemap settings
  sm_per: number;
  sm_images: boolean;
  sm_featured: boolean;
  sm_exclude_posts: string;
  sm_exclude_terms: string;
  sm_posts: boolean;
  sm_pages: boolean;
  sm_categories: boolean;
  sm_tags: boolean;
  sm_authors: boolean;
  news_name: string;
  news_language: string;
  news_exclude_cats: string;
}

export const SEO_DEFAULTS: SeoSettings = {
  configured: false,
  site_type: "news",
  represents: "organization",
  org_name: "",
  org_logo: "",
  org_type: "NewsMediaOrganization",
  person_name: "",
  default_schema: "NewsArticle",
  separator: "–",
  post_title_format: "%title% %sep% %sitename%",
  page_title_format: "%title% %sep% %sitename%",
  archive_title_format: "%term% %sep% %sitename%",
  home_title: "",
  home_description: "",
  default_og_image: "",
  facebook_url: "",
  twitter_username: "",
  same_as: "",
  noindex_tags: false,
  noindex_authors: false,
  noindex_paginated: false,
  noindex_empty_categories: true,
  breadcrumbs_schema: true,
  faq_schema: true,
  publisher_schema: true,
  google_verification: "",
  bing_verification: "",
  yandex_verification: "",
  pinterest_verification: "",
  max_image_preview: "large",
  news_sitemap: true,
  redirect_404_enabled: false,
  redirect_404_url: "",

  wizard_level: "easy",
  m_sitemap: true,
  m_schema: true,
  m_instant_indexing: true,
  m_image_seo: false,
  m_analyzer: true,
  m_role_manager: false,
  m_link_counter: true,
  nofollow_external: false,
  nofollow_image_links: false,
  external_blank: false,
  affiliate_prefix: "",
  img_alt_missing: true,
  img_title_missing: false,
  baidu_verification: "",
  norton_verification: "",
  robots_txt: "",
  role_editor_seo: true,
  role_author_seo: true,
  robots_nofollow: false,
  robots_noarchive: false,
  robots_noimageindex: false,
  robots_nosnippet: false,
  max_snippet: -1,
  max_video_preview: -1,
  capitalize_titles: false,
  twitter_card: "summary_large_image",
  noindex_site: false,
  fb_author: "",
  fb_admin: "",
  fb_app_id: "",
  home_og_title: "",
  home_og_description: "",
  home_og_image: "",
  author_title_format: "%name% %sep% %sitename% %page%",
  author_description_format: "%user_description%",
  search_title_format: "%search_query% %page% %sep% %sitename%",
  title_404: "Page Not Found %sep% %sitename%",
  noindex_search: true,
  post_description_format: "%excerpt%",
  page_description_format: "%excerpt%",
  category_description_format: "%term_description%",
  noindex_categories: false,
  tag_title_format: "%term% Archives %sep% %sitename%",
  tag_description_format: "%term_description%",
  sm_per: 1000,
  sm_images: true,
  sm_featured: true,
  sm_exclude_posts: "",
  sm_exclude_terms: "",
  sm_posts: true,
  sm_pages: true,
  sm_categories: true,
  sm_tags: true,
  sm_authors: true,
  news_name: "",
  news_language: "",
  news_exclude_cats: "",
};

const getSeoCached = unstable_cache(
  async (): Promise<SeoSettings> => {
    try {
      const row = await prisma.appConfig.findUnique({ where: { configKey: SEO_KEY } });
      return { ...SEO_DEFAULTS, ...(row?.configValue ? JSON.parse(row.configValue) : {}) };
    } catch {
      return SEO_DEFAULTS;
    }
  },
  ["seo-settings"],
  { revalidate: 300, tags: ["seo-settings"] }
);
export const getSeoSettings = cache(getSeoCached);

export interface SeoVars {
  title?: string;
  term?: string;
  sitename: string;
  sep: string;
  page?: number;
  excerpt?: string;
  category?: string;
  focuskw?: string;
  term_description?: string;
  name?: string;
  user_description?: string;
  search_query?: string;
  sitedesc?: string;
}

/** Rank Math variables: "%title% %sep% %sitename%" → "Post title – Site". Unknown variables are removed. */
export function formatTitle(format: string, vars: SeoVars): string {
  const v: Record<string, string> = {
    title: vars.title ?? "",
    term: vars.term ?? vars.title ?? "",
    sitename: vars.sitename,
    sitedesc: vars.sitedesc ?? "",
    sep: vars.sep || "–",
    separator: vars.sep || "–",
    page: vars.page && vars.page > 1 ? `Page ${vars.page}` : "",
    excerpt: vars.excerpt ?? "",
    category: vars.category ?? "",
    focuskw: vars.focuskw ?? "",
    term_description: vars.term_description ?? "",
    name: vars.name ?? "",
    user_description: vars.user_description ?? "",
    search_query: vars.search_query ?? "",
    currentyear: String(new Date().getFullYear()),
    currentmonth: new Date().toLocaleString("en", { month: "long" }),
  };
  const out = (format || "%title% %sep% %sitename%")
    .replace(/%([a-z_]+)%/g, (_, k: string) => v[k] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  // Drop a dangling separator left by an empty part.
  const sep = (vars.sep || "–").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return out.replace(new RegExp(`^(${sep}\\s*)+|(\\s*${sep})+$`, "g"), "").replace(new RegExp(`(${sep}\\s*){2,}`, "g"), `${vars.sep || "–"} `).trim();
}

/** Same as formatTitle, plus "Capitalize Titles" from Titles & Meta → Global. */
export function seoTitle(seo: Pick<SeoSettings, "capitalize_titles">, format: string, vars: SeoVars): string {
  const t = formatTitle(format, vars);
  return seo.capitalize_titles ? t.replace(/(^|\s)(\p{Ll})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : t;
}

/** Description from a template like "%excerpt%"; empty when every variable is empty. */
export function formatDescription(format: string, vars: SeoVars): string {
  const out = formatTitle(format || "%excerpt%", vars);
  const plain = out.replace(new RegExp(`^[\\s${(vars.sep || "–").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]+$`), "");
  return plain.slice(0, 300);
}

/** Straight from the database (admin screens, so they always show what is saved). */
export async function loadSeoSettingsFresh(): Promise<SeoSettings> {
  const row = await prisma.appConfig.findUnique({ where: { configKey: SEO_KEY } });
  try {
    return { ...SEO_DEFAULTS, ...(row?.configValue ? JSON.parse(row.configValue) : {}) };
  } catch {
    return SEO_DEFAULTS;
  }
}
