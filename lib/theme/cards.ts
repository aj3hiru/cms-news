import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { POSTS_TAG } from "../posts";

export interface CardPost {
  id: number;
  title: string;
  slug: string;
  date: Date | null;
  authorName: string;
  authorSlug: string | null;
  bannerPath: string | null;
  bannerAlt: string | null;
  excerpt: string;
  categoryName: string;
  categorySlug: string;
}

type Filter = { kind: "all" } | { kind: "category"; id: number } | { kind: "tag"; id: number } | { kind: "author"; id: number } | { kind: "search"; q: string };

function where(f: Filter): Prisma.PostWhereInput {
  const base: Prisma.PostWhereInput = { status: "published" };
  switch (f.kind) {
    case "category":
      return { ...base, OR: [{ categoryId: f.id }, { postCategories: { some: { categoryId: f.id } } }] };
    case "tag":
      return { ...base, postTags: { some: { tagId: BigInt(f.id) } } };
    case "author":
      return { ...base, authorId: f.id };
    case "search":
      return { ...base, OR: [{ title: { contains: f.q } }, { content: { contains: f.q } }] };
    default:
      return base;
  }
}

async function load(f: Filter, page: number, perPage: number): Promise<{ posts: CardPost[]; total: number }> {
  const w = where(f);
  const [total, rows] = await Promise.all([
    prisma.post.count({ where: w }),
    prisma.post.findMany({
      where: w,
      orderBy: { date: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        slug: true,
        date: true,
        excerpt: true,
        author: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        featuredImage: { select: { filePath: true, altText: true } },
        postMeta: { where: { metaKey: { in: ["summary", "description"] } }, select: { metaKey: true, metaValue: true } },
      },
    }),
  ]);
  return {
    total,
    posts: rows.map((r) => {
      const meta = Object.fromEntries(r.postMeta.map((m) => [m.metaKey, m.metaValue ?? ""]));
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        date: r.date,
        authorName: r.author?.name ?? "",
        authorSlug: r.author?.slug ?? null,
        bannerPath: r.featuredImage?.filePath ?? null,
        bannerAlt: r.featuredImage?.altText ?? null,
        excerpt: (meta.summary || meta.description || r.excerpt || "").trim().slice(0, 200),
        categoryName: r.category?.name ?? "",
        categorySlug: r.category?.slug ?? "",
      };
    }),
  };
}

const cached = unstable_cache(load, ["nb-card-posts-v2"], { revalidate: 60, tags: [POSTS_TAG] });

/** Posts for the home / archive card grids (cached; search is not cached). */
export async function getCardPosts(f: Filter, page: number, perPage: number) {
  const res = f.kind === "search" ? await load(f, page, perPage) : await cached(f, page, perPage);
  return {
    total: res.total,
    totalPages: Math.max(1, Math.ceil(res.total / perPage)),
    posts: res.posts.map((p) => ({ ...p, date: p.date ? new Date(p.date) : null })),
  };
}
