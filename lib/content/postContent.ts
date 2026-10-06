import { prisma } from "../db";
import { postUrl, optimizedImage } from "../urls";
import type { AlsoReadStyle } from "../theme/types";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "section";
}

/**
 * Gives every H2–H4 an id (kept if it already has one) and returns them in
 * order — used by the Table of Contents and the mobile reading-progress
 * button, so both always jump to the same anchors.
 */
export function addHeadingIds(html: string): { html: string; headings: TocItem[] } {
  const headings: TocItem[] = [];
  const used = new Map<string, number>();
  const out = html.replace(/<h([2-4])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (whole, lvl: string, attrs: string | undefined, inner: string) => {
    const text = decode(inner.replace(/<[^>]+>/g, "")).trim();
    if (!text) return whole;
    const existing = /\sid\s*=\s*["']([^"']+)["']/i.exec(attrs ?? "")?.[1];
    let id = existing ?? slugifyHeading(text);
    if (!existing) {
      const n = (used.get(id) ?? 0) + 1;
      used.set(id, n);
      if (n > 1) id = `${id}-${n}`;
    }
    headings.push({ id, text, level: Number(lvl) });
    return existing ? whole : `<h${lvl}${attrs ?? ""} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, headings };
}

export interface AlsoReadPost {
  id: number;
  title: string;
  slug: string;
  bannerPath: string | null;
  excerpt: string;
  date: Date | null;
}

/** Posts for the in-article "Also Read" cards. */
export async function getAlsoReadPosts(source: "category" | "latest", categoryId: number, excludeId: number, count: number): Promise<AlsoReadPost[]> {
  const take = Math.max(1, Math.min(12, count));
  const rows = await prisma.post.findMany({
    where: { status: "published", id: { not: excludeId }, ...(source === "category" ? { categoryId } : {}) },
    orderBy: { date: "desc" },
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      date: true,
      excerpt: true,
      content: true,
      featuredImage: { select: { filePath: true } },
      postMeta: { where: { metaKey: { in: ["summary", "description"] } }, select: { metaKey: true, metaValue: true } },
    },
  });
  if (source === "category" && rows.length < take) {
    // Not enough in this category: top up with the latest posts.
    const more = await getAlsoReadPosts("latest", categoryId, excludeId, take + rows.length);
    const seen = new Set(rows.map((r) => r.id));
    return [...rows.map(toAlso), ...more.filter((m) => !seen.has(m.id))].slice(0, take);
  }
  return rows.map(toAlso);
}

function toAlso(r: {
  id: number;
  title: string;
  slug: string;
  date: Date | null;
  excerpt: string | null;
  content: string;
  featuredImage: { filePath: string } | null;
  postMeta: { metaKey: string; metaValue: string | null }[];
}): AlsoReadPost {
  const meta = Object.fromEntries(r.postMeta.map((m) => [m.metaKey, m.metaValue ?? ""]));
  const text = (meta.summary || meta.description || r.excerpt || decode(r.content.replace(/<[^>]+>/g, " "))).replace(/\s+/g, " ").trim();
  return { id: r.id, title: r.title, slug: r.slug, bannerPath: r.featuredImage?.filePath ?? null, excerpt: text.slice(0, 170), date: r.date };
}

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One "Also Read" card as HTML (it is placed between paragraphs of the post body). */
export function alsoReadHtml(p: AlsoReadPost, style: AlsoReadStyle, label: string, siteName: string): string {
  const url = postUrl(p.slug);
  const img = p.bannerPath ? optimizedImage(p.bannerPath, 640) : "";
  const title = escHtml(p.title);
  const lbl = escHtml(label || "Also Read");
  const excerpt = escHtml(p.excerpt.length >= 170 ? p.excerpt.replace(/\s+\S*$/, "") + " …" : p.excerpt);
  switch (style) {
    case "compact":
      return `<aside class="nb-also nb-also--compact" aria-label="${lbl}"><a href="${url}">${img ? `<img src="${optimizedImage(p.bannerPath, 256)}" alt="" width="120" height="68" loading="lazy" decoding="async">` : ""}<span class="nb-also-body"><span class="nb-also-label">${lbl}</span><span class="nb-also-title">${title}</span></span></a></aside>`;
    case "accent":
      return `<aside class="nb-also nb-also--accent" aria-label="${lbl}"><span class="nb-also-label">${lbl}:</span> <a href="${url}" class="nb-also-title">${title}</a></aside>`;
    case "minimal":
      return `<aside class="nb-also nb-also--minimal" aria-label="${lbl}"><span class="nb-also-label">${lbl}</span><a href="${url}" class="nb-also-title">${title}</a><span class="nb-also-arrow" aria-hidden="true">→</span></aside>`;
    default:
      return `<figure class="nb-also nb-also--card wp-block-embed is-type-wp-embed"><div class="nb-also-label">${lbl}</div><a href="${url}" class="nb-also-link">${img ? `<span class="nb-also-img"><img src="${img}" alt="${title}" width="640" height="360" loading="lazy" decoding="async"></span>` : ""}<span class="nb-also-title">${title}</span>${excerpt ? `<span class="nb-also-excerpt">${excerpt} <span class="nb-also-more">Continue reading</span></span>` : ""}</a><div class="nb-also-foot"><span class="nb-also-site">${escHtml(siteName)}</span></div></figure>`;
  }
}

/** Paragraph numbers from a setting like "3, 7" (deduplicated, ascending). */
export function parseParagraphList(v: string): number[] {
  return [...new Set(String(v ?? "").split(/[^\d]+/).map((x) => parseInt(x, 10)).filter((n) => n > 0 && n < 200))].sort((a, b) => a - b);
}
