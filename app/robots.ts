import type { MetadataRoute } from "next";
import { resolveSiteConfig } from "@/lib/config";

/** SEO-tool crawlers: allowed, but slowed down and kept out of the admin (as keops-ingenierie.fr does). */
const SLOW_BOTS = [
  "8LEGS",
  "AhrefsBot",
  "AspiegelBot",
  "BLEXBot",
  "Barkrowler",
  "DotBot",
  "MJ12bot",
  "MauiBot",
  "Nimbostratus-Bot",
  "PetalBot",
  "SemrushBot",
  "SeznamBot",
  "Sogou",
  "serpstatbot",
  "trendiction",
  "TextBulkerBot",
];
/** AI-training / bulk scrapers: blocked from the whole site. */
const BLOCKED_BOTS = ["Amazonbot", "Bytespider", "CCBot", "cohere-ai", "FacebookBot", "Omgilibot"];
const PRIVATE = ["/admin", "/admin-login", "/api/"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteConfig = await resolveSiteConfig("");
  const base = siteConfig.siteUrl.replace(/\/+$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...PRIVATE, "/search"] },
      { userAgent: SLOW_BOTS, crawlDelay: 180, disallow: PRIVATE },
      { userAgent: BLOCKED_BOTS, disallow: "/" },
    ],
    sitemap: [`${base}/sitemap.xml`, `${base}/sitemap-news.xml`],
  };
}
