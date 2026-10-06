import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { postUrl, optimizedImage } from "../urls";
import type { AlsoReadGroup, AlsoReadStyle } from "../theme/types";

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

/** Posts for one "Also Read" group. `exclude` keeps groups from repeating each other. */
export async function getAlsoReadPosts(
  group: Pick<AlsoReadGroup, "source" | "count" | "post_ids">,
  categoryId: number,
  exclude: number[]
): Promise<AlsoReadPost[]> {
  const take = Math.max(1, Math.min(12, group.count));
  const select: Prisma.PostSelect = {
    id: true,
    title: true,
    slug: true,
    date: true,
    excerpt: true,
    content: true,
    featuredImage: { select: { filePath: true } },
    postMeta: { where: { metaKey: { in: ["summary", "description"] } }, select: { metaKey: true, metaValue: true } },
  };
  if (group.source === "manual") {
    const ids = group.post_ids.filter((id) => !exclude.includes(id)).slice(0, take);
    if (!ids.length) return [];
    const rows = await prisma.post.findMany({ where: { id: { in: ids }, status: "published" }, select });
    const byId = new Map(rows.map((r) => [r.id, toAlso(r as unknown as AlsoRow)]));
    return ids.map((id) => byId.get(id)).filter((x): x is AlsoReadPost => Boolean(x));
  }
  const rows = await prisma.post.findMany({
    where: { status: "published", id: { notIn: exclude }, ...(group.source === "category" ? { categoryId } : {}) },
    orderBy: { date: "desc" },
    take,
    select,
  });
  const out = rows.map((r) => toAlso(r as unknown as AlsoRow));
  if (group.source === "category" && out.length < take) {
    // Not enough in this category: top up with the latest posts.
    const more = await getAlsoReadPosts({ source: "latest", count: take - out.length, post_ids: [] }, categoryId, [...exclude, ...out.map((o) => o.id)]);
    out.push(...more);
  }
  return out;
}

type AlsoRow = {
  id: number;
  title: string;
  slug: string;
  date: Date | null;
  excerpt: string | null;
  content: string;
  featuredImage: { filePath: string } | null;
  postMeta: { metaKey: string; metaValue: string | null }[];
};

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

/**
 * One "Also Read" box: the label once at the top and every post inside the same
 * container. The embed-card style becomes a swipe slider with a position bar
 * (no arrows) when it holds more than one post.
 */
export function alsoReadGroupHtml(posts: AlsoReadPost[], style: AlsoReadStyle, label: string, continueLabel = "Continue reading"): string {
  if (!posts.length) return "";
  const lbl = escHtml(label || "Also Read");
  if (style === "accent") {
    return `<aside class="nb-also nb-also--accent" aria-label="${lbl}"><div class="nb-also-label">${lbl}</div><ul>${posts
      .map((p) => `<li><a href="${postUrl(p.slug)}">${escHtml(p.title)}</a></li>`)
      .join("")}</ul></aside>`;
  }
  if (style === "minimal") {
    return `<aside class="nb-also nb-also--minimal" aria-label="${lbl}"><div class="nb-also-label">${lbl}</div><ul>${posts
      .map((p) => `<li><a href="${postUrl(p.slug)}">${escHtml(p.title)}</a><span class="nb-also-arrow" aria-hidden="true">→</span></li>`)
      .join("")}</ul></aside>`;
  }
  const cards = posts
    .map((p) => {
      const img = p.bannerPath ? optimizedImage(p.bannerPath, 640) : "";
      const title = escHtml(p.title);
      const excerpt = escHtml(p.excerpt.length >= 170 ? p.excerpt.replace(/\s+\S*$/, "") + " …" : p.excerpt);
      return `<a href="${postUrl(p.slug)}" class="nb-also-slide">${img ? `<span class="nb-also-img"><img src="${img}" alt="${title}" width="640" height="360" loading="lazy" decoding="async"></span>` : ""}<span class="nb-also-title">${title}</span>${excerpt ? `<span class="nb-also-excerpt">${excerpt} <span class="nb-also-more">${escHtml(continueLabel)}</span></span>` : ""}</a>`;
    })
    .join("");
  const many = posts.length > 1;
  return `<figure class="nb-also nb-also--card${many ? " nb-also--slider" : ""}" aria-label="${lbl}"><div class="nb-also-label">${lbl}</div><div class="nb-also-track">${cards}</div>${
    many ? `<div class="nb-also-bar" aria-hidden="true"><span style="width:${(100 / posts.length).toFixed(2)}%"></span></div><div class="nb-also-count" aria-hidden="true">1 / ${posts.length}</div>` : ""
  }</figure>`;
}
