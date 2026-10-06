import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/listings";
import { getCardPosts } from "@/lib/theme/cards";
import { getSiteContext } from "@/lib/theme/site";
import { archiveMetadata } from "@/lib/theme/archiveMeta";
import { getSeoSettings } from "@/lib/seo/settings";
import { categoryUrl } from "@/lib/urls";
import { ArchiveView } from "@/components/theme/ArchiveView";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const cat = await getCategoryBySlug(slug);
  if (!cat) return {};
  const seo = await getSeoSettings();
  const empty = seo.noindex_empty_categories && (await prisma.post.count({ where: { categoryId: cat.id, status: "published" } })) === 0;
  const meta = await archiveMetadata({ term: cat.metaTitle || cat.name, description: cat.metaDescription, path: categoryUrl(slug), page, noindex: empty });
  return cat.metaKeywords ? { ...meta, keywords: cat.metaKeywords } : meta;
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  prisma.category.update({ where: { id: cat.id }, data: { views: { increment: 1 } } }).catch(() => {});
  const { theme } = await getSiteContext();
  const { posts, total, totalPages } = await getCardPosts({ kind: "category", id: cat.id }, page, Math.max(2, Math.min(50, theme.archive.per_page)));
  return (
    <ArchiveView
        sidebarOn="category"
      adPage="category"
      posts={posts}
      page={page}
      totalPages={totalPages}
      href={(p) => (p > 1 ? `${categoryUrl(slug)}?page=${p}` : categoryUrl(slug))}
      empty="No posts in this category yet."
      head={
        <header className="nb-archive-head">
          <span className="nb-archive-kicker">Category · {total} {total === 1 ? "post" : "posts"}</span>
          <h1>{cat.name}</h1>
          {cat.metaDescription && <p>{cat.metaDescription}</p>}
        </header>
      }
    />
  );
}
