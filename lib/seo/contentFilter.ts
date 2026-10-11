import type { SeoSettings } from "./settings";

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * SEO → General Settings → Links / Images, applied when a post or page is shown (the stored content is never changed):
 * nofollow / new tab for external links, rel="sponsored nofollow" for affiliate prefixes, nofollow for links to image
 * files, and (Image SEO module) missing alt / title text filled with the post title.
 */
export function applySeoContentFilter(html: string, seo: SeoSettings, opts: { title: string; host: string }): string {
  const host = opts.host.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
  const prefixes = seo.affiliate_prefix
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const linkRules = seo.nofollow_external || seo.external_blank || seo.nofollow_image_links || prefixes.length > 0;
  let out = html;

  if (linkRules) {
    out = out.replace(/<a\b([^>]*?)\bhref=(["'])([^"']+)\2([^>]*)>/gi, (tag, pre: string, q: string, href: string, post: string) => {
      const attrs = `${pre} ${post}`;
      let linkHost = "";
      try {
        linkHost = /^https?:\/\//i.test(href) ? new URL(href).host.replace(/^www\./, "").toLowerCase() : "";
      } catch {
        return tag;
      }
      const external = Boolean(linkHost) && linkHost !== host && !linkHost.endsWith(`.${host}`);
      const affiliate = prefixes.some((p) => href.startsWith(p) || (p.startsWith("/") && href.includes(`${host}${p}`)));
      const imageFile = /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i.test(href) && external;
      const relBefore = (/\brel=["']([^"']*)["']/i.exec(attrs)?.[1] ?? "").split(/\s+/).filter(Boolean);
      const rel = new Set(relBefore);
      if (affiliate) {
        rel.add("sponsored");
        rel.add("nofollow");
      }
      if (external && seo.nofollow_external && !/\bdofollow\b/.test(attrs)) rel.add("nofollow");
      if (imageFile && seo.nofollow_image_links) rel.add("nofollow");
      const targetBefore = (/\btarget=["']([^"']*)["']/i.exec(attrs)?.[1] ?? "").trim();
      let target = targetBefore;
      if ((external || affiliate) && seo.external_blank && !target) target = "_blank";
      if (target === "_blank") {
        rel.add("noopener");
      }
      if (target === targetBefore && rel.size === new Set(relBefore).size) return tag; // nothing to change
      const rest = attrs.replace(/\s*\b(rel|target)=["'][^"']*["']/gi, "").replace(/\s+/g, " ").trim();
      return `<a${rest ? ` ${rest}` : ""} href=${q}${href}${q}${target ? ` target="${target}"` : ""}${rel.size ? ` rel="${[...rel].join(" ")}"` : ""}>`;
    });
  }

  if (seo.m_image_seo && (seo.img_alt_missing || seo.img_title_missing) && opts.title) {
    const t = attr(opts.title);
    out = out.replace(/<img\b[^>]*>/gi, (tag) => {
      let x = tag;
      if (seo.img_alt_missing && !/\balt=["'][^"']+["']/i.test(x)) x = x.replace(/\s*\balt=["']["']/i, "").replace(/<img\b/i, `<img alt="${t}"`);
      if (seo.img_title_missing && !/\btitle=["'][^"']+["']/i.test(x)) x = x.replace(/<img\b/i, `<img title="${t}"`);
      return x;
    });
  }
  return out;
}
