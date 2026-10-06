import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getTagById } from "@/lib/listings";
import { getCardPosts } from "@/lib/theme/cards";
import { getSiteContext } from "@/lib/theme/site";
import { archiveMetadata } from "@/lib/theme/archiveMeta";
import { getSeoSettings } from "@/lib/seo/settings";
import { tagUrl } from "@/lib/urls";
import { ArchiveView } from "@/components/theme/ArchiveView";

export const revalidate = 60;

type Props = { params: Promise<{ tagSlugId: string }>; searchParams: Promise<{ page?: string }> };

function parseTagSlugId(v: string): { slug: string; id: number } | null {
  const m = /^(.+)-(\d+)$/.exec(v);
  return m ? { slug: m[1], id: parseInt(m[2], 10) } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const parsed = parseTagSlugId((await params).tagSlugId);
  if (!parsed) return {};
  const tag = await getTagById(parsed.id);
  if (!tag) return {};
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const seo = await getSeoSettings();
  return archiveMetadata({ term: tag.name, path: tagUrl(tag.slug, Number(tag.id)), page, noindex: seo.noindex_tags });
}

export default async function TagPage({ params, searchParams }: Props) {
  const parsed = parseTagSlugId((await params).tagSlugId);
  if (!parsed) notFound();
  const tag = await getTagById(parsed.id);
  if (!tag) notFound();
  if (tag.slug !== parsed.slug) redirect(tagUrl(tag.slug, Number(tag.id)));
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  prisma.tag.update({ where: { id: tag.id }, data: { views: { increment: 1 } } }).catch(() => {});
  const { theme } = await getSiteContext();
  const base = tagUrl(tag.slug, Number(tag.id));
  const { posts, total, totalPages } = await getCardPosts({ kind: "tag", id: Number(tag.id) }, page, Math.max(2, Math.min(50, theme.archive.per_page)));
  return (
    <ArchiveView
        sidebarOn="tag"
      adPage="tag"
      posts={posts}
      page={page}
      totalPages={totalPages}
      href={(p) => (p > 1 ? `${base}?page=${p}` : base)}
      head={
        <header className="nb-archive-head">
          <span className="nb-archive-kicker">Tag · {total} {total === 1 ? "post" : "posts"}</span>
          <h1>#{tag.name}</h1>
        </header>
      }
    />
  );
}
