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

/** "%title% %sep% %sitename%" → "Post title – Site". */
export function formatTitle(format: string, vars: { title?: string; term?: string; sitename: string; sep: string; page?: number }): string {
  const out = (format || "%title% %sep% %sitename%")
    .replace(/%title%/g, vars.title ?? "")
    .replace(/%term%/g, vars.term ?? vars.title ?? "")
    .replace(/%sitename%/g, vars.sitename)
    .replace(/%sep%/g, vars.sep || "–")
    .replace(/%page%/g, vars.page && vars.page > 1 ? `Page ${vars.page}` : "")
    .replace(/\s+/g, " ")
    .trim();
  // Drop a dangling separator left by an empty part.
  const sep = (vars.sep || "–").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return out.replace(new RegExp(`^(${sep}\\s*)+|(\\s*${sep})+$`, "g"), "").trim();
}
