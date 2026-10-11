/** SEO-tool crawlers: allowed, but slowed down and kept out of the admin (as keops-ingenierie.fr does). */
const SLOW_BOTS = ["8LEGS", "AhrefsBot", "AspiegelBot", "BLEXBot", "Barkrowler", "DotBot", "MJ12bot", "MauiBot", "Nimbostratus-Bot", "PetalBot", "SemrushBot", "SeznamBot", "Sogou", "serpstatbot", "trendiction", "TextBulkerBot"];
/** AI-training / bulk scrapers: blocked from the whole site. */
const BLOCKED_BOTS = ["Amazonbot", "Bytespider", "CCBot", "cohere-ai", "FacebookBot", "Omgilibot"];
const PRIVATE = ["/admin", "/admin-login", "/api/"];

/** robots.txt rules used when SEO → General Settings → Edit robots.txt is empty. */
export function defaultRobotsRules(): string {
  return [
    ["User-Agent: *", "Allow: /", ...PRIVATE.map((p) => `Disallow: ${p}`), "Disallow: /search"].join("\n"),
    [...SLOW_BOTS.map((b) => `User-Agent: ${b}`), ...PRIVATE.map((p) => `Disallow: ${p}`), "Crawl-delay: 180"].join("\n"),
    [...BLOCKED_BOTS.map((b) => `User-Agent: ${b}`), "Disallow: /"].join("\n"),
  ].join("\n\n");
}
