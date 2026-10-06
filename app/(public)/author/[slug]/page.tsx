import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuthorBySlug } from "@/lib/listings";
import { getCardPosts } from "@/lib/theme/cards";
import { getSiteContext } from "@/lib/theme/site";
import { archiveMetadata } from "@/lib/theme/archiveMeta";
import { getSeoSettings } from "@/lib/seo/settings";
import { authorUrl, optimizedImage, resolveMediaUrl } from "@/lib/urls";
import { stripTags } from "@/lib/postDetail";
import { ArchiveView } from "@/components/theme/ArchiveView";
import { SocialIcon, VerifiedIcon } from "@/components/theme/icons";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return {};
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const seo = await getSeoSettings();
  return archiveMetadata({ term: author.name, description: author.bio ? stripTags(author.bio).slice(0, 160) : null, path: authorUrl(slug), page, noindex: seo.noindex_authors });
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const ctx = await getSiteContext();
  const t = ctx.t;
  const { posts, total, totalPages } = await getCardPosts({ kind: "author", id: author.id }, page, Math.max(2, Math.min(50, ctx.theme.archive.per_page)));
  const socials = (
    [
      ["facebook", author.facebook],
      ["x", author.twitter],
      ["instagram", author.instagram],
      ["threads", author.threads],
      ["linkedin", author.linkedin],
    ] as const
  ).filter(([, u]) => u);
  const person = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: author.name,
      url: `${ctx.siteUrl}${authorUrl(slug)}`,
      ...(author.designation ? { jobTitle: author.designation } : {}),
      ...(author.profileImage ? { image: `${ctx.siteUrl}${resolveMediaUrl(author.profileImage)}` } : {}),
      ...(author.bio ? { description: stripTags(author.bio).slice(0, 300) } : {}),
      ...(socials.length ? { sameAs: socials.map(([, u]) => u) } : {}),
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} />
      <ArchiveView
        sidebarOn="author"
        adPage="category"
        posts={posts}
        page={page}
        totalPages={totalPages}
        href={(p) => (p > 1 ? `${authorUrl(slug)}?page=${p}` : authorUrl(slug))}
        head={
          <header className="nb-author-head">
            {author.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={optimizedImage(author.profileImage, 256)} alt={author.name} width={90} height={90} />
            ) : (
              <span className="nb-avatar-fallback" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4.2" fill="currentColor" />
                  <path d="M3.5 21c.8-4.4 4.2-7 8.5-7s7.7 2.6 8.5 7" fill="currentColor" />
                </svg>
              </span>
            )}
            <div>
              <h1>
                {author.name} <VerifiedIcon />
              </h1>
              {author.designation && <span className="nb-archive-kicker">{author.designation}</span>}
              {author.bio && <p>{stripTags(author.bio)}</p>}
              <p className="nb-author-count">
                {total} {t.articles}
              </p>
              {socials.length > 0 && (
                <div className="author-socials">
                  {socials.map(([n, u]) => (
                    <a key={n} className="author-social-link" href={u!} target="_blank" rel="noopener nofollow" aria-label={n}>
                      <SocialIcon network={n} className="nb-author-ico" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </header>
        }
      />
    </>
  );
}
