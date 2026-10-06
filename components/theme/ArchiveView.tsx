import type { AdPageType } from "@/lib/adInserterTypes";
import { getListAdSlots } from "@/lib/adRendering";
import { getSiteContext } from "@/lib/theme/site";
import type { CardPost } from "@/lib/theme/cards";
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
}: {
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
  const { theme } = await getSiteContext();
  const showSidebar = theme.sidebar[`on_${sidebarOn}`];
  const ads = await getListAdSlots(adPage);
  return (
    <main className="nb-archive">
      <ListingAds page={adPage} position="before_post" />
      <div className={`nb-archive-layout${showSidebar ? "" : " nb-no-sidebar"}`}>
        <div className="nb-archive-main">
          {head}
          {children}
          <ListingAds page={adPage} position="before_content" />
          {posts.length ? <NewsGrid posts={posts} archive={theme.archive} ads={ads} /> : <p className="nb-empty">{empty}</p>}
          <ListingAds page={adPage} position="after_content" />
          <NewsPagination page={page} totalPages={totalPages} href={href} />
        </div>
        {showSidebar && <TrendingSidebar />}
      </div>
      <ListingAds page={adPage} position="after_post" />
      <ListingAds page={adPage} position="footer" />
    </main>
  );
}
