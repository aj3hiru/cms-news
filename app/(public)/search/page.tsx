import type { Metadata } from "next";
import { getCardPosts } from "@/lib/theme/cards";
import { getSiteContext } from "@/lib/theme/site";
import { ArchiveView } from "@/components/theme/ArchiveView";
import { tl } from "@/lib/i18n/public";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q?.trim() ?? "";
  const ctx = await getSiteContext();
  return { title: { absolute: q ? `${ctx.t.resultsFor} “${q}” – ${ctx.siteName}` : `${ctx.t.search} – ${ctx.siteName}` }, robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const ctx = await getSiteContext();
  const t = ctx.t;
  const res = q ? await getCardPosts({ kind: "search", q }, page, Math.max(2, Math.min(50, ctx.theme.archive.per_page))) : { posts: [], total: 0, totalPages: 1 };
  const enc = encodeURIComponent(q);
  return (
    <ArchiveView
        sidebarOn="search"
      adPage="search"
      posts={res.posts}
      page={page}
      totalPages={res.totalPages}
      href={(p) => `/search?q=${enc}${p > 1 ? `&page=${p}` : ""}`}
      empty={q ? t.nothingFound : t.typeToSearch}
      head={
        <header className="nb-archive-head">
          <span className="nb-archive-kicker">
            {t.search}
            {q ? ` · ${res.total} ${res.total === 1 ? t.result : t.results}` : ""}
          </span>
          <h1>{q ? `${t.resultsFor} “${q}”` : t.search}</h1>
        </header>
      }
    >
      <form className="nb-search-form" action="/search" method="get" role="search">
        <input type="search" name="q" defaultValue={q} placeholder={tl(ctx.theme.header.search_placeholder, "searchPlaceholder", t)} aria-label={t.search} />
        <button type="submit" className="nb-btn">
          {t.search}
        </button>
      </form>
    </ArchiveView>
  );
}
