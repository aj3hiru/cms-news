import type { AdPageType } from "@/lib/adInserterTypes";
import { getListAdSlots } from "@/lib/adRendering";
import { getSiteContext } from "@/lib/theme/site";
import { tl } from "@/lib/i18n/public";
import type { CardPost } from "@/lib/theme/cards";
import type { HomeMoreInfo } from "@/lib/theme/homeFeed";
import { ListingAds } from "@/components/shared/ListingAds";
import { NewsGrid, NewsPagination } from "./NewsGrid";
import { TrendingSidebar } from "./TrendingSidebar";

/** Homepage / archive page: optional header, card grid, pagination and the trending sidebar. */
export async function ArchiveView({
  adPage,
  sidebarOn,
  head,
  posts,
  page,
  totalPages,
  href,
  empty = "No posts found.",
  children,
  more,
}: {
  /** Homepage featured layout: the rest of the page loads on scroll. */
  more?: HomeMoreInfo;
  adPage: AdPageType;
  /** Which "Show sidebar on" setting applies to this page. */
  sidebarOn: "home" | "category" | "tag" | "author" | "search";
  head?: React.ReactNode;
  posts: CardPost[];
  page: number;
  totalPages: number;
  href: (p: number) => string;
  empty?: string;
  children?: React.ReactNode;
}) {
  const { theme, t, locale } = await getSiteContext();
  const showSidebar = theme.sidebar[`on_${sidebarOn}`];
  const ads = await getListAdSlots(adPage);
  const a = theme.archive;
  // Homepage "featured" layout: lead card on page 1, then three per row.
  const featured =
    sidebarOn === "home" && a.home_layout === "featured"
      ? { lead: page === 1, readMore: a.home_read_more.trim() ? tl(a.home_read_more, "readMore", t) : "", gridReadMore: a.home_grid_read_more }
      : undefined;
  return (
    <main className="nb-archive">
      <ListingAds page={adPage} position="before_post" />
      <div className={`nb-archive-layout${showSidebar ? "" : " nb-no-sidebar"}`}>
        <div className="nb-archive-main">
          {head}
          {children}
          <ListingAds page={adPage} position="before_content" />
          {posts.length ? <NewsGrid posts={posts} archive={a} ads={ads} byLabel={t.by} locale={locale} featured={featured} more={featured ? more : undefined} /> : <p className="nb-empty">{empty === "No posts found." ? t.noPosts : empty}</p>}
          <ListingAds page={adPage} position="after_content" />
          <NewsPagination page={page} totalPages={totalPages} href={href} labels={{ prev: t.previous, next: t.next }} />
        </div>
        {showSidebar && <TrendingSidebar />}
      </div>
      <ListingAds page={adPage} position="after_post" />
      <ListingAds page={adPage} position="footer" />
    </main>
  );
}
