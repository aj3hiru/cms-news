"use server";
import type { UserRole } from "@prisma/client";
import { invalidatePosts } from "./posts";
import { pingIndexNow } from "./indexNow";
import { notifyPostPublished } from "./push/autoSend";

import { trimContentEdges } from "./trimContent";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireUser, canEditPost, resolvePermissions, assignableAuthorWhere } from "./auth";

/**
 * "Cache warming" — right after a post is published, this fires a single
 * background request to the post's own public URL so Next.js generates
 * and caches that page BEFORE any real visitor arrives, instead of the
 * very first human hit paying for a cold render. Fire-and-forget: never
 * awaited, and any failure here (site not reachable from itself yet,
 * etc.) is swallowed rather than breaking the publish flow — worst
 * case, the first real visitor just gets a normal (still fast, just not
 * pre-warmed) ISR render instead.
 *
 * Real bug fixed here: this used to fall back to hardcoded
 * "http://localhost:3000" whenever APP_URL wasn't set, which meant every
 * single publish/update fired a request to localhost in production —
 * visibly showing up repeatedly wherever that request or its failure got
 * logged. There's no reliable way to detect the real public domain from
 * here (this runs from a Server Action, with no incoming request to read
 * a Host header from) — so if APP_URL isn't set, this now skips cache
 * warming entirely instead of guessing wrong. Set APP_URL in .env.local
 * to enable it.
 */
function warmPostCache(slug: string): void {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) return; // no reliable base URL available — skip rather than guess wrong
  const baseUrl = appUrl.replace(/\/+$/, "");
  fetch(`${baseUrl}/${slug}`, { headers: { "x-cache-warm": "1" } }).catch(() => {});
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveSlug(desired: string, excludePostId?: number): Promise<string> {
  let slug = slugify(desired) || `post-${Date.now()}`;
  let suffix = 1;
  for (;;) {
    const existing = await prisma.post.findFirst({
      where: { slug, ...(excludePostId ? { id: { not: excludePostId } } : {}) },
      select: { id: true },
    });
    if (!existing) return slug;
    suffix += 1;
    slug = `${slugify(desired)}-${suffix}`;
  }
}

interface ParsedPostForm {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  categoryId: number;
  additionalCategoryIds: number[];
  stateId: number | null;
  status: "draft" | "published" | "archived";
  /** Set when the editor chose "Scheduled": saved as draft + publish_at meta. */
  publishAt: string | null;
  faqJson: string | null;
  tagNames: string[];
  featuredImageId: number | undefined;
  /** The editor removed the featured image (the field was sent empty). */
  featuredImageCleared: boolean;
  metaDescription: string;
  metaKeywords: string;
  summary: string;
  keyPoints: string[];
  seoTitle: string;
  focusKeyword: string;
  schemaType: string;
  canonical: string;
  noindex: boolean;
  ogTitle: string;
  ogDescription: string;
}

async function parsePostForm(formData: FormData, excludePostId?: number): Promise<ParsedPostForm> {
  const title = String(formData.get("title") ?? "").trim();
  const categoryId = parseInt(String(formData.get("categoryId") ?? ""), 10);
  if (!title || !categoryId) {
    throw new Error("Title and category are required.");
  }

  const slug = await resolveSlug(String(formData.get("slug") ?? title) || title, excludePostId);
  const tagNames = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const featuredImageIdRaw = String(formData.get("featuredImageId") ?? "").trim();
  const stateIdRaw = String(formData.get("stateId") ?? "").trim();
  const additionalCategoryIds = formData
    .getAll("additionalCategoryIds")
    .map((v) => parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n !== categoryId);

  return {
    title,
    slug,
    content: trimContentEdges(String(formData.get("content") ?? "")),
    excerpt: String(formData.get("excerpt") ?? "") || null,
    categoryId,
    additionalCategoryIds,
    stateId: stateIdRaw ? parseInt(stateIdRaw, 10) : null,
    ...parseStatus(formData),
    faqJson: String(formData.get("faqJson") ?? "") || null,
    tagNames,
    featuredImageId: featuredImageIdRaw ? parseInt(featuredImageIdRaw, 10) : undefined,
    featuredImageCleared: formData.has("featuredImageUrl") && !String(formData.get("featuredImageUrl") ?? "").trim(),
    metaDescription: String(formData.get("metaDescription") ?? "").trim(),
    metaKeywords: String(formData.get("metaKeywords") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim().slice(0, 2000),
    keyPoints: formData
      .getAll("keyPoints")
      .map((v) => String(v).trim().slice(0, 500))
      .filter(Boolean)
      .slice(0, 20),
    seoTitle: String(formData.get("seoTitle") ?? "").trim().slice(0, 200),
    focusKeyword: String(formData.get("focusKeyword") ?? "").trim().slice(0, 120),
    schemaType: String(formData.get("schemaType") ?? "").trim().slice(0, 40),
    canonical: String(formData.get("canonical") ?? "").trim().slice(0, 500),
    noindex: formData.get("noindex") === "on",
    ogTitle: String(formData.get("ogTitle") ?? "").trim().slice(0, 200),
    ogDescription: String(formData.get("ogDescription") ?? "").trim().slice(0, 300),
  };
}

function parseStatus(formData: FormData): { status: ParsedPostForm["status"]; publishAt: string | null } {
  const raw = String(formData.get("status") ?? "draft");
  if (raw === "scheduled") {
    const at = new Date(String(formData.get("publishAt") ?? ""));
    if (isNaN(at.getTime())) throw new Error("Pick a date and time to schedule this post.");
    // A time already passed simply publishes now.
    if (at.getTime() <= Date.now()) return { status: "published", publishAt: null };
    return { status: "draft", publishAt: at.toISOString() };
  }
  const status = raw === "published" || raw === "archived" ? raw : "draft";
  return { status, publishAt: null };
}

async function savePostMeta(postId: number, parsed: ParsedPostForm) {
  await prisma.postMeta.deleteMany({ where: { postId } });
  const entries: { metaKey: string; metaValue: string }[] = [];
  if (parsed.metaKeywords) entries.push({ metaKey: "keywords", metaValue: parsed.metaKeywords });
  if (parsed.metaDescription) entries.push({ metaKey: "description", metaValue: parsed.metaDescription });
  if (parsed.summary) entries.push({ metaKey: "summary", metaValue: parsed.summary });
  if (parsed.keyPoints.length) entries.push({ metaKey: "key_points", metaValue: JSON.stringify(parsed.keyPoints) });
  if (parsed.seoTitle) entries.push({ metaKey: "seo_title", metaValue: parsed.seoTitle });
  if (parsed.focusKeyword) entries.push({ metaKey: "focus_keyword", metaValue: parsed.focusKeyword });
  if (parsed.schemaType) entries.push({ metaKey: "schema_type", metaValue: parsed.schemaType });
  if (parsed.canonical) entries.push({ metaKey: "canonical", metaValue: parsed.canonical });
  if (parsed.noindex) entries.push({ metaKey: "noindex", metaValue: "1" });
  if (parsed.ogTitle) entries.push({ metaKey: "og_title", metaValue: parsed.ogTitle });
  if (parsed.ogDescription) entries.push({ metaKey: "og_description", metaValue: parsed.ogDescription });
  if (parsed.publishAt) entries.push({ metaKey: "publish_at", metaValue: parsed.publishAt });
  if (entries.length > 0) {
    await prisma.postMeta.createMany({ data: entries.map((e) => ({ postId, ...e })) });
  }
}

async function linkOrphanedEditorImages(postId: number, userId: number, content: string) {
  const candidates = await prisma.media.findMany({
    where: { postId: null, uploadedBy: userId },
    select: { id: true, filePath: true },
    orderBy: { uploadedAt: "desc" },
    take: 50,
  });
  const matchingIds = candidates.filter((m) => content.includes(m.filePath)).map((m) => m.id);
  if (matchingIds.length > 0) {
    await prisma.media.updateMany({ where: { id: { in: matchingIds } }, data: { postId } });
  }
}

async function syncCategories(postId: number, categoryId: number, additionalCategoryIds: number[]) {
  await prisma.postCategory.deleteMany({ where: { postId } });
  const allIds = [categoryId, ...additionalCategoryIds];
  await prisma.postCategory.createMany({
    data: allIds.map((categoryId) => ({ postId, categoryId })),
    skipDuplicates: true,
  });
}

async function syncTags(postId: number, tagNames: string[]) {
  await prisma.postTag.deleteMany({ where: { postId } });
  for (const name of tagNames) {
    const slug = slugify(name);
    if (!slug) continue;
    const tag = await prisma.tag.upsert({ where: { slug }, create: { name, slug }, update: {} });
    await prisma.postTag.create({ data: { postId, tagId: tag.id } }).catch(() => {});
  }
}

/** The submitted author, if this user may assign posts to them (see assignableAuthorWhere). */
async function allowedAuthorId(user: { id: number; role: UserRole }, raw: string): Promise<number | null> {
  const id = parseInt(raw, 10);
  const scope = assignableAuthorWhere(user);
  if (!id || scope === null) return null;
  const ok = await prisma.author.count({ where: { AND: [{ id }, scope] } });
  if (!ok) throw new Error("You can only assign posts to yourself or the authors assigned to you.");
  return id;
}

export async function createPost(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) redirect("/admin-login");

  const permissions = resolvePermissions(user);
  if (!permissions.blogs.create) {
    throw new Error("You do not have permission to create posts.");
  }

  const parsed = await parsePostForm(formData);

  const authorIdRaw = String(formData.get("authorId") ?? "").trim();
  const chosenAuthorId = await allowedAuthorId(user, authorIdRaw);
  let authorId: number;
  if (chosenAuthorId) {
    authorId = chosenAuthorId;
  } else {
    const author = await prisma.author.findUnique({ where: { userId: user.id } });
    if (!author) {
      throw new Error("No author profile is linked to your account yet — ask an admin to create one.");
    }
    authorId = author.id;
  }

  const post = await prisma.post.create({
    data: {
      title: parsed.title,
      slug: parsed.slug,
      content: parsed.content,
      excerpt: parsed.excerpt,
      categoryId: parsed.categoryId,
      stateId: parsed.stateId,
      authorId,
      status: parsed.status,
      faqJson: parsed.faqJson,
      ...(parsed.featuredImageId ? { featuredImageId: parsed.featuredImageId } : {}),
    },
  });

  await Promise.all([
    syncCategories(post.id, parsed.categoryId, parsed.additionalCategoryIds),
    syncTags(post.id, parsed.tagNames),
    savePostMeta(post.id, parsed),
    linkOrphanedEditorImages(post.id, user.id, parsed.content),
  ]);

  await prisma.activityLog.create({
    data: { userId: user.id, actionType: "post_create", description: `Created Post: ${parsed.title} (ID: ${post.id})` },
  });

  // Invalidate the ISR cache for this post's public URL + the homepage/
  // category listings it now appears in, so the new post is visible
  // immediately instead of waiting for the time-based revalidate window
  // (see `export const revalidate` in the public post/homepage routes).
  revalidatePath("/admin/blogs-manager");
  invalidatePosts();
  revalidatePath(`/${parsed.slug}`);
  revalidatePath("/");
  if (parsed.status === "published") {
    warmPostCache(parsed.slug);
    pingIndexNow([`/${parsed.slug}`]);
    void notifyPostPublished(post.id);
  }
  redirect(`/admin/post-manager/${post.id}/edit?success=created`);
}

export async function updatePost(postId: number, formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) redirect("/admin-login");

  const permissions = resolvePermissions(user);
  const allowed = await canEditPost(user.role, permissions, user.id, postId);
  if (!allowed) {
    throw new Error("You do not have permission to edit this post.");
  }

  const parsed = await parsePostForm(formData, postId);

  const authorId = (await allowedAuthorId(user, String(formData.get("authorId") ?? "").trim())) ?? undefined;

  await prisma.post.update({
    where: { id: postId },
    data: {
      title: parsed.title,
      slug: parsed.slug,
      content: parsed.content,
      excerpt: parsed.excerpt,
      categoryId: parsed.categoryId,
      stateId: parsed.stateId,
      status: parsed.status,
      faqJson: parsed.faqJson,
      ...(authorId ? { authorId } : {}),
      ...(parsed.featuredImageId ? { featuredImageId: parsed.featuredImageId } : parsed.featuredImageCleared ? { featuredImageId: null } : {}),
    },
  });

  await Promise.all([
    syncCategories(postId, parsed.categoryId, parsed.additionalCategoryIds),
    syncTags(postId, parsed.tagNames),
    savePostMeta(postId, parsed),
    linkOrphanedEditorImages(postId, user.id, parsed.content),
  ]);

  await prisma.activityLog.create({
    data: { userId: user.id, actionType: "post_update", description: `Updated Post: ${parsed.title} (ID: ${postId})` },
  });

  revalidatePath("/admin/blogs-manager");
  invalidatePosts();
  revalidatePath(`/${parsed.slug}`);
  revalidatePath("/");
  if (parsed.status === "published") {
    warmPostCache(parsed.slug);
    pingIndexNow([`/${parsed.slug}`]);
    void notifyPostPublished(postId);
  }
  redirect(`/admin/post-manager/${postId}/edit?success=updated`);
}
