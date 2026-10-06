/**
 * Site-wide shortcodes — usable in posts, pages, the footer, the header
 * top bar and any Customizer text field. Plain value shortcodes are
 * replaced here; [contact_form] is rendered as a real form by
 * components/shortcodes/RichContent.tsx.
 */

export interface ShortcodeContext {
  siteName: string;
  siteUrl: string;
  tagline: string;
  email: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const SHORTCODE_HELP: { code: string; description: string }[] = [
  { code: "[site_title]", description: "Site title (Site Identity)" },
  { code: "[site_url]", description: "Site address, e.g. https://example.com (also [site-url])" },
  { code: "[site_link]", description: "Site title linked to the homepage" },
  { code: "[site_tagline]", description: "Tagline (Site Identity)" },
  { code: "[site_domain]", description: "Domain only, e.g. example.com" },
  { code: "[contact_email]", description: "Admin / contact email" },
  { code: "[year]", description: "Current year" },
  { code: "[date]", description: "Today's date" },
  { code: "[contact_form]", description: "Contact form (name, email, message) — submissions go to Contact Messages" },
];

/** Replaces every value shortcode. Leaves [contact_form] for RichContent. */
export function applyShortcodes(input: string | null | undefined, ctx: ShortcodeContext): string {
  if (!input || input.indexOf("[") === -1) return input ?? "";
  let domain = ctx.siteUrl;
  try {
    domain = new URL(ctx.siteUrl).host;
  } catch {}
  const now = new Date();
  const map: Record<string, string> = {
    site_title: esc(ctx.siteName),
    site_name: esc(ctx.siteName),
    site_url: esc(ctx.siteUrl),
    home_url: esc(ctx.siteUrl),
    site_link: `<a href="${esc(ctx.siteUrl)}/">${esc(ctx.siteName)}</a>`,
    site_tagline: esc(ctx.tagline),
    site_domain: esc(domain),
    contact_email: esc(ctx.email),
    admin_email: esc(ctx.email),
    year: String(now.getFullYear()),
    date: now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  };
  return input.replace(/\[([a-z_-]+)\s*\/?\]/gi, (whole, name: string) => {
    const key = name.toLowerCase().replace(/-/g, "_");
    return key in map ? map[key] : whole;
  });
}

/** Same as applyShortcodes, for plain text (no HTML links). */
export function applyShortcodesText(input: string | null | undefined, ctx: ShortcodeContext): string {
  return applyShortcodes(input, ctx)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}
