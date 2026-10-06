"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { AdminHtml } from "@/components/AdminHtml";
import type { CardPost } from "@/lib/theme/cards";
import type { ThemeSettings } from "@/lib/theme/types";
import { HOME_BATCH, type HomeMoreInfo } from "@/lib/theme/homeFeed";
import { NewsCard, type FeaturedOpts } from "./NewsCard";

type Wire = Omit<CardPost, "date"> & { date: string | null };

/**
 * Rest of the homepage page: the server sends the first screen of posts, the
 * others come in batches when the reader nears the end of the list.
 */
export function HomeMore({
  info,
  start,
  archive,
  featured,
  ads,
  byLabel,
  locale,
}: {
  info: HomeMoreInfo;
  start: number;
  archive: ThemeSettings["archive"];
  featured: FeaturedOpts;
  ads?: { before: Record<number, string>; after: Record<number, string> };
  byLabel: string;
  locale: string;
}) {
  const onPage = Math.max(0, Math.min(info.perPage, info.total - (info.page - 1) * info.perPage));
  const [posts, setPosts] = useState<CardPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loaded = start + posts.length;
  const done = ended || loaded >= onPage;

  const loadMore = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/home-posts?page=${info.page}&offset=${loaded}&limit=${HOME_BATCH}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { posts: Wire[] };
      const next = data.posts.map((p) => ({ ...p, date: p.date ? new Date(p.date) : null }));
      if (!next.length) setEnded(true);
      setPosts((cur) => {
        const seen = new Set(cur.map((p) => p.id));
        return [...cur, ...next.filter((p) => !seen.has(p.id))];
      });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // Load when the end of the list is near the screen — or already scrolled past (fast swipe, End key).
  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || loading || failed) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      if (el.getBoundingClientRect().top < window.innerHeight + 300) {
        stop();
        loadMore();
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const stop = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return stop;
  }, [loaded, done, loading, failed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {posts.map((p, j) => {
        const n = start + j + 1;
        return (
          <Fragment key={p.id}>
            {ads?.before[n] && <AdminHtml html={ads.before[n]} className="ad-slot nb-grid-ad" allowFrame />}
            <NewsCard p={p} archive={archive} featured={featured} byLabel={byLabel} locale={locale} />
            {ads?.after[n] && <AdminHtml html={ads.after[n]} className="ad-slot nb-grid-ad" allowFrame />}
          </Fragment>
        );
      })}
      {!done && (
        <div ref={sentinel} className="nb-more" aria-live="polite">
          {failed ? (
            <button type="button" className="nb-more-retry" onClick={loadMore}>
              ↻
            </button>
          ) : (
            <span className="nb-more-spin" aria-label="Loading" />
          )}
        </div>
      )}
    </>
  );
}
