import { POST_META_KEYS, parseKeyPoints } from "@/lib/postDetail";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canEditPost, resolvePermissions } from "@/lib/auth";
import { PostForm } from "@/components/admin/PostForm";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (!Number.isFinite(postId)) notFound();

  const user = await requireUser();
  if (!user) redirect("/admin-login");
  const permissions = resolvePermissions(user);

  const allowed = await canEditPost(user.role, permissions, user.id, postId);
  if (!allowed) {
    return (
      <div className="empty-state">
        <h3>Access denied</h3>
        <p>You don&apos;t have permission to edit this post.</p>
      </div>
    );
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      postTags: { include: { tag: true } },
      featuredImage: { select: { filePath: true } },
      postMeta: { where: { metaKey: { in: [...POST_META_KEYS, "publish_at"] } } },
    },
  });
  if (!post) notFound();

  const metaByKey = Object.fromEntries(post.postMeta.map((m) => [m.metaKey, m.metaValue ?? ""]));

  return (
    <PostForm
      post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          categoryId: post.categoryId,
          authorId: post.authorId,
          status: post.status === "draft" && metaByKey.publish_at ? "scheduled" : post.status,
          publishAt: metaByKey.publish_at ?? "",
          faqJson: post.faqJson,
          tags: post.postTags.map((pt) => pt.tag.name),
          featuredImagePath: post.featuredImage?.filePath ?? null,
          metaDescription: metaByKey.description ?? "",
          metaKeywords: metaByKey.keywords ?? "",
          summary: metaByKey.summary ?? "",
          keyPoints: parseKeyPoints(metaByKey.key_points),
          seo: {
            title: metaByKey.seo_title ?? "",
            focusKeyword: metaByKey.focus_keyword ?? "",
            schemaType: metaByKey.schema_type ?? "",
            canonical: metaByKey.canonical ?? "",
            noindex: metaByKey.noindex === "1",
            ogTitle: metaByKey.og_title ?? "",
            ogDescription: metaByKey.og_description ?? "",
          },
        }}
      />
  );
}
