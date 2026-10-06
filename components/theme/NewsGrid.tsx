import { Fragment } from "react";
import { AdminHtml } from "@/components/AdminHtml";
import type { CardPost } from "@/lib/theme/cards";
import type { ThemeSettings } from "@/lib/theme/types";
import { postUrl, authorUrl, categoryUrl, optimizedImage, imageSrcSet } from "@/lib/urls";
import { CalendarIcon, VerifiedIcon } from "./icons";

const Bolt = () => (
  <svg className="nb-card-bolt" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);

const fmt = (d: Date | null, loc = "en-US") => (d ? d.toLocaleDateString(loc, { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" }) : "");

/** Card grid used by the homepage and every archive (category, tag, author, search). */
export function NewsGrid({
  posts,
  archive,
  ads,
  eagerFirst = true,
  byLabel = "By",
  locale = "en-US",
  featured,
}: {
  /** Homepage brandsfever layout: `lead` = first post as a large card. */
  featured?: { lead: boolean; readMore: string };
  byLabel?: string;
  locale?: string;
  posts: CardPost[];
  archive: ThemeSettings["archive"];
  ads?: { before: Record<number, string>; after: Record<number, string> };
  eagerFirst?: boolean;
}) {
  return (
    <div
      className={featured ? "nb-grid nb-grid--feat" : "nb-grid"}
      style={featured || archive.columns === 2 ? undefined : { gridTemplateColumns: `repeat(${archive.columns}, minmax(0, 1fr))` }}
    >
      {posts.map((p, i) => (
        <Fragment key={p.id}>
          {ads?.before[i + 1] && <AdminHtml html={ads.before[i + 1]} className="ad-slot nb-grid-ad" allowFrame />}
          <article className={featured ? (featured.lead && i === 0 ? "nb-card nb-card--feat nb-card--lead" : "nb-card nb-card--feat") : "nb-card"}>
            <a className="nb-card-img" href={postUrl(p.slug)} tabIndex={-1} aria-hidden="true">
              {p.bannerPath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={optimizedImage(p.bannerPath, 640)}
                  srcSet={imageSrcSet(p.bannerPath, [384, 640, 828])}
                  sizes={featured?.lead && i === 0 ? "(max-width: 640px) 100vw, 560px" : featured ? "(max-width: 640px) 100vw, 380px" : "(max-width: 640px) 100vw, 480px"}
                  alt={p.bannerAlt || p.title}
                  width={640}
                  height={360}
                  loading={eagerFirst && i < 2 ? "eager" : "lazy"}
                  fetchPriority={eagerFirst && i === 0 ? "high" : undefined}
                  decoding="async"
                />
              )}
            </a>
            <div className="nb-card-body">
              {featured && p.categoryName && (
                <a className="nb-card-cat" href={categoryUrl(p.categorySlug)}>
                  <Bolt />
                  {p.categoryName}
                </a>
              )}
              {!featured && (archive.show_author || archive.show_date) && (
                <div className="nb-card-meta">
                  {archive.show_author && p.authorName && (
                    <span>
                      {byLabel} {p.authorSlug ? <a href={authorUrl(p.authorSlug)}>{p.authorName}</a> : p.authorName} <VerifiedIcon />
                    </span>
                  )}
                  {archive.show_author && archive.show_date && p.authorName && <span className="sep">|</span>}
                  {archive.show_date && p.date && (
                    <time className="nb-card-date" dateTime={p.date.toISOString()}>
                      <CalendarIcon />
                      {fmt(p.date, locale)}
                    </time>
                  )}
                </div>
              )}
              <h2 className="nb-card-title">
                <a href={postUrl(p.slug)}>{p.title}</a>
              </h2>
              {featured && (archive.show_author || archive.show_date) && (
                <div className="nb-card-meta">
                  {archive.show_author && p.authorName && (
                    <span>
                      {byLabel} {p.authorSlug ? <a href={authorUrl(p.authorSlug)}>{p.authorName}</a> : p.authorName}
                    </span>
                  )}
                  {archive.show_author && archive.show_date && p.authorName && <span className="sep">·</span>}
                  {archive.show_date && p.date && (
                    <time className="nb-card-date" dateTime={p.date.toISOString()}>
                      {fmt(p.date, locale)}
                    </time>
                  )}
                </div>
              )}
              {(featured || archive.show_excerpt) && p.excerpt && <p className="nb-card-excerpt">{p.excerpt}</p>}
              {featured?.readMore && (
                <a className="nb-card-more" href={postUrl(p.slug)} aria-label={`${featured.readMore}: ${p.title}`}>
                  {featured.readMore}
                </a>
              )}
            </div>
          </article>
          {ads?.after[i + 1] && <AdminHtml html={ads.after[i + 1]} className="ad-slot nb-grid-ad" allowFrame />}
        </Fragment>
      ))}
    </div>
  );
}

/** Numbered pagination: ‹ 1 … 4 5 6 … 20 › */
export function NewsPagination({ page, totalPages, href, labels }: { page: number; totalPages: number; href: (p: number) => string; labels?: { prev: string; next: string } }) {
  if (totalPages <= 1) return null;
  const items: (number | "…")[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) items.push(n);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return (
    <nav className="nb-pagination" aria-label="Pagination">
      {page > 1 && (
        <a href={href(page - 1)} rel="prev" aria-label={labels?.prev ?? "Previous page"}>
          ‹
        </a>
      )}
      {items.map((n, i) =>
        n === "…" ? (
          <span key={`d${i}`} className="dots">
            …
          </span>
        ) : n === page ? (
          <span key={n} className="current" aria-current="page">
            {n}
          </span>
        ) : (
          <a key={n} href={href(n)}>
            {n}
          </a>
        )
      )}
      {page < totalPages && (
        <a href={href(page + 1)} rel="next" aria-label={labels?.next ?? "Next page"}>
          ›
        </a>
      )}
    </nav>
  );
}
