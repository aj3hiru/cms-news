import type { Metadata } from "next";
import { getCardPosts } from "@/lib/theme/cards";
import { getSiteContext } from "@/lib/theme/site";
import { ArchiveView } from "@/components/theme/ArchiveView";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q?.trim() ?? "";
  const ctx = await getSiteContext();
  return { title: { absolute: q ? `Search results for “${q}” – ${ctx.siteName}` : `Search – ${ctx.siteName}` }, robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const ctx = await getSiteContext();
  const res = q ? await getCardPosts({ kind: "search", q }, page, Math.max(2, Math.min(50, ctx.theme.archive.per_page))) : { posts: [], total: 0, totalPages: 1 };
  const enc = encodeURIComponent(q);
  return (
    <ArchiveView
      adPage="search"
      posts={res.posts}
      page={page}
      totalPages={res.totalPages}
      href={(p) => `/search?q=${enc}${p > 1 ? `&page=${p}` : ""}`}
      empty={q ? `Nothing found for “${q}”. Try different keywords.` : "Type something to search."}
      head={
        <header className="nb-archive-head">
          <span className="nb-archive-kicker">Search{q ? ` · ${res.total} ${res.total === 1 ? "result" : "results"}` : ""}</span>
          <h1>{q ? `Results for “${q}”` : "Search"}</h1>
        </header>
      }
    >
      <form className="nb-search-form" action="/search" method="get" role="search">
        <input type="search" name="q" defaultValue={q} placeholder={ctx.theme.header.search_placeholder} aria-label="Search" />
        <button type="submit" className="nb-btn">
          Search
        </button>
      </form>
    </ArchiveView>
  );
}
