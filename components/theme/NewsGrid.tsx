import { Fragment } from "react";
import { AdminHtml } from "@/components/AdminHtml";
import type { CardPost } from "@/lib/theme/cards";
import type { ThemeSettings } from "@/lib/theme/types";
import { NewsCard, type FeaturedOpts } from "./NewsCard";
import type { HomeMoreInfo } from "@/lib/theme/homeFeed";
import { HomeMore } from "./HomeMore";

/** Card grid used by the homepage and every archive (category, tag, author, search). */
export function NewsGrid({
  posts,
  archive,
  ads,
  eagerFirst = true,
  byLabel = "By",
  locale = "en-US",
  featured,
  more,
}: {
  byLabel?: string;
  locale?: string;
  posts: CardPost[];
  archive: ThemeSettings["archive"];
  ads?: { before: Record<number, string>; after: Record<number, string> };
  eagerFirst?: boolean;
  /** Homepage brandsfever layout. */
  featured?: FeaturedOpts;
  /** Homepage: the rest of the page loads as the reader scrolls. */
  more?: HomeMoreInfo;
}) {
  return (
    <div
      className={featured ? "nb-grid nb-grid--feat" : "nb-grid"}
      style={featured || archive.columns === 2 ? undefined : { gridTemplateColumns: `repeat(${archive.columns}, minmax(0, 1fr))` }}
    >
      {posts.map((p, i) => (
        <Fragment key={p.id}>
          {ads?.before[i + 1] && <AdminHtml html={ads.before[i + 1]} className="ad-slot nb-grid-ad" allowFrame />}
          <NewsCard
            p={p}
            archive={archive}
            featured={featured}
            isLead={Boolean(featured?.lead && i === 0)}
            eager={eagerFirst && i < (featured ? 4 : 2)}
            priority={eagerFirst && i === 0}
            byLabel={byLabel}
            locale={locale}
          />
          {ads?.after[i + 1] && <AdminHtml html={ads.after[i + 1]} className="ad-slot nb-grid-ad" allowFrame />}
        </Fragment>
      ))}
      {featured && more && <HomeMore info={more} start={posts.length} archive={archive} featured={featured} ads={ads} byLabel={byLabel} locale={locale} />}
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
