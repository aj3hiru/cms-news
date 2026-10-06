"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { invalidatePosts } from "./posts";
import { pingIndexNow } from "./indexNow";
import { postUrl, staticPagePath } from "./urls";

export type BulkScope =
  | { kind: "posts"; ids: number[] }
  | { kind: "categories"; ids: number[] }
  | { kind: "tags"; ids: number[] }
  | { kind: "all" }
  | { kind: "pages"; ids: number[] | "all" };

export interface BulkItem {
  id: number;
  title: string;
  type: "post" | "page";
  date: string | null;
}

async function admin() {
  const u = await requireUser();
  if (!u || (u.role !== "admin" && u.role !== "editor")) throw new Error("Only admins and editors can bulk-update dates.");
  return u;
}

/** Lists for the pickers (categories, tags, recent posts / pages). */
export async function getBulkSources(q = "") {
  await admin();
  const term = q.trim();
  const [categories, tags, posts, pages] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { posts: { where: { status: "published" } } } } } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, take: 300, select: { id: true, name: true, _count: { select: { postTags: true } } } }),
    prisma.post.findMany({ where: { status: "published", ...(term ? { title: { contains: term } } : {}) }, orderBy: { date: "desc" }, take: 40, select: { id: true, title: true, date: true } }),
    prisma.page.findMany({ where: { status: "published" }, orderBy: { title: "asc" }, select: { id: true, title: true, updatedAt: true } }),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, count: c._count.posts })),
    tags: tags.map((t) => ({ id: Number(t.id), name: t.name, count: t._count.postTags })),
    posts: posts.map((p) => ({ id: p.id, title: p.title, date: p.date?.toISOString() ?? null })),
    pages: pages.map((p) => ({ id: p.id, title: p.title, date: p.updatedAt?.toISOString() ?? null })),
  };
}

/** The items a selection covers, newest first (the order they get their new times in). */
export async function previewBulkUpdate(scope: BulkScope): Promise<BulkItem[]> {
  await admin();
  if (scope.kind === "pages") {
    const rows = await prisma.page.findMany({
      where: { status: "published", ...(scope.ids === "all" ? {} : { id: { in: scope.ids } }) },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
    return rows.map((r) => ({ id: r.id, title: r.title, type: "page", date: r.updatedAt?.toISOString() ?? null }));
  }
  const where =
    scope.kind === "posts"
      ? { id: { in: scope.ids } }
      : scope.kind === "categories"
        ? { OR: [{ categoryId: { in: scope.ids } }, { postCategories: { some: { categoryId: { in: scope.ids } } } }] }
        : scope.kind === "tags"
          ? { postTags: { some: { tagId: { in: scope.ids.map((i) => BigInt(i)) } } } }
          : {};
  const rows = await prisma.post.findMany({ where: { status: "published", ...where }, orderBy: { date: "desc" }, take: 20000, select: { id: true, title: true, date: true } });
  return rows.map((r) => ({ id: r.id, title: r.title, type: "post", date: r.date?.toISOString() ?? null }));
}

/** Gives one batch its new dates. Published and modified dates both become the new time. */
export async function applyBulkBatch(batch: { id: number; type: "post" | "page"; at: string }[]): Promise<{ id: number; type: "post" | "page"; slug: string; at: string }[]> {
  await admin();
  const out: { id: number; type: "post" | "page"; slug: string; at: string }[] = [];
  for (const b of batch.slice(0, 50)) {
    const at = new Date(b.at);
    if (isNaN(at.getTime())) continue;
    if (b.type === "page") {
      const p = await prisma.page.update({ where: { id: b.id }, data: { createdAt: at, updatedAt: at }, select: { slug: true } }).catch(() => null);
      if (p) out.push({ id: b.id, type: "page", slug: p.slug, at: at.toISOString() });
    } else {
      const p = await prisma.post.update({ where: { id: b.id }, data: { date: at, updatedAt: at }, select: { slug: true } }).catch(() => null);
      if (p) out.push({ id: b.id, type: "post", slug: p.slug, at: at.toISOString() });
    }
  }
  return out;
}

/**
 * After the run: refresh every cache that shows dates (pages, lists, feeds,
 * sitemaps) and tell search engines (IndexNow) the pages changed, so the new
 * dates are what Google, Bing and readers see.
 */
export async function finishBulkUpdate(done: { type: "post" | "page"; slug: string }[], userNote: string): Promise<{ pinged: number }> {
  const user = await admin();
  const paths = done.map((d) => (d.type === "page" ? staticPagePath(d.slug) : postUrl(d.slug)));
  for (const p of paths.slice(0, 500)) revalidatePath(p);
  invalidatePosts();
  for (const tag of ["posts", "seo-feeds", "sitemaps"]) revalidateTag(tag, "max");
  revalidatePath("/", "layout");
  for (let i = 0; i < paths.length; i += 1000) pingIndexNow(paths.slice(i, i + 1000));
  await prisma.activityLog
    .create({ data: { userId: user.id, actionType: "bulk_date_update", description: `Bulk date update: ${done.length} item(s). ${userNote}`.slice(0, 500) } })
    .catch(() => {});
  return { pinged: paths.length };
}
