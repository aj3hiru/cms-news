import { prisma } from "@/lib/db";
import { requireUser, assignableAuthorWhere } from "@/lib/auth";
import { createPost, updatePost } from "@/lib/postEditor";
import { resolveMediaUrl } from "@/lib/urls";
import { resolveSiteConfig } from "@/lib/config";
import { getSeoSettings, SCHEMA_TYPES } from "@/lib/seo/settings";
import { PostFormClient, type PostFormClientPost } from "./PostFormClient";

export type PostFormPost = PostFormClientPost;

/** Add / edit post screen (Post Manager). */
export async function PostForm({ post }: { post?: PostFormPost }) {
  const user = await requireUser();
  const authorScope = user ? assignableAuthorWhere(user) : null;
  const canAssignAuthor = authorScope !== null;

  const [categories, authors, siteConfig, seo] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    canAssignAuthor
      ? prisma.author.findMany({ where: authorScope ?? undefined, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
    resolveSiteConfig(""),
    getSeoSettings(),
  ]);

  const action = post ? updatePost.bind(null, post.id) : createPost;
  const authorLabel = canAssignAuthor ? (authors.find((a) => a.id === post?.authorId)?.name ?? authors[0]?.name ?? "") : user?.username ?? "";

  return (
    <PostFormClient
      action={action}
      post={post ? { ...post, featuredImagePath: post.featuredImagePath ? resolveMediaUrl(post.featuredImagePath) : "" } : undefined}
      categories={categories}
      authors={authors}
      canAssignAuthor={canAssignAuthor}
      authorLabel={authorLabel}
      isNew={!post}
      seoDefaults={{
        siteName: siteConfig.siteName,
        siteUrl: siteConfig.siteUrl,
        separator: seo.separator,
        titleFormat: seo.post_title_format,
        defaultSchema: seo.default_schema,
        schemaTypes: { ...SCHEMA_TYPES },
      }}
    />
  );
}
