import type { CardPost } from "@/lib/theme/cards";
import type { ThemeSettings } from "@/lib/theme/types";
import { postUrl, authorUrl, categoryUrl, optimizedImage, imageSrcSet } from "@/lib/urls";
import { CalendarIcon, VerifiedIcon } from "./icons";

const fmt = (d: Date | null, loc = "en-US") => (d ? d.toLocaleDateString(loc, { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" }) : "");

const Bolt = () => (
  <svg className="nb-card-bolt" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);

export interface FeaturedOpts {
  /** First post of the page as the large lead card. */
  lead: boolean;
  /** Button text; empty = no button. */
  readMore: string;
  /** Button on the three-per-row cards too. */
  gridReadMore: boolean;
}

/** One post card. Rendered on the server for the first screen and in the browser for posts loaded on scroll. */
export function NewsCard({
  p,
  archive,
  featured,
  isLead = false,
  eager = false,
  priority = false,
  byLabel = "By",
  locale = "en-US",
}: {
  p: CardPost;
  archive: ThemeSettings["archive"];
  featured?: FeaturedOpts;
  isLead?: boolean;
  eager?: boolean;
  priority?: boolean;
  byLabel?: string;
  locale?: string;
}) {
  const showMore = featured?.readMore && (isLead || featured.gridReadMore);
  return (
    <article className={featured ? (isLead ? "nb-card nb-card--feat nb-card--lead" : "nb-card nb-card--feat") : "nb-card"}>
      <a className="nb-card-img" href={postUrl(p.slug)} tabIndex={-1} aria-hidden="true">
        {p.bannerPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizedImage(p.bannerPath, 640)}
            srcSet={imageSrcSet(p.bannerPath, [384, 640, 828])}
            sizes={isLead ? "(max-width: 640px) 100vw, 560px" : featured ? "(max-width: 640px) 100vw, 380px" : "(max-width: 640px) 100vw, 480px"}
            alt={p.bannerAlt || p.title}
            width={640}
            height={360}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
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
        {showMore && (
          <a className="nb-card-more" href={postUrl(p.slug)} aria-label={`${featured.readMore}: ${p.title}`}>
            {featured.readMore}
          </a>
        )}
      </div>
    </article>
  );
}
