import { getHomePosts, getPopularPosts } from "@/lib/posts";
import { postUrl, optimizedImage } from "@/lib/urls";
import { getSiteContext } from "@/lib/theme/site";
import { CalendarIcon } from "./icons";

const fmt = (d: Date | null, loc: string) => (d ? d.toLocaleDateString(loc, { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" }) : "");

/** Sticky "ट्रेंडिंग ख़बरें" sidebar (Customizer → Post Template → Sidebar). */
export async function TrendingSidebar({ excludeId }: { excludeId?: number }) {
  const { theme, locale } = await getSiteContext();
  const sb = theme.sidebar;
  const count = Math.max(1, Math.min(20, sb.count));
  const rows =
    sb.source === "latest"
      ? (await getHomePosts(count + 1, 0)).map((p) => ({ id: p.id, title: p.title, slug: p.slug, date: p.date, bannerPath: p.bannerPath }))
      : await getPopularPosts(count + 1);
  const posts = rows.filter((p) => p.id !== excludeId).slice(0, count);
  if (!posts.length) return null;
  return (
    <aside className={`post-sidebar${sb.sticky ? "" : " nb-sidebar-static"}`}>
      <div className="trending-box">
        <div className="trending-box-header">
          <svg viewBox="0 0 384 512" aria-hidden="true">
            <path d="M192 0C79.7 101.3 0 220.9 0 300.5 0 425 79 512 192 512s192-87 192-211.5c0-79.9-80.2-199.6-192-300.5zm0 448c-56.5 0-96-39-96-94.8 0-13.5 4.6-61.5 96-161.2 91.4 99.7 96 147.7 96 161.2 0 55.8-39.5 94.8-96 94.8z" />
          </svg>
          <h2>{sb.title}</h2>
        </div>
        <div className="trending-list">
          {posts.map((p) => (
            <div className="trending-item" key={p.id}>
              <div className="trending-item-thumb">
                <a href={postUrl(p.slug)} tabIndex={-1} aria-hidden="true">
                  {p.bannerPath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={optimizedImage(p.bannerPath, 256)} alt="" loading="lazy" decoding="async" width={200} height={120} />
                  )}
                </a>
              </div>
              <div className="trending-item-info">
                <p className="trending-item-title">
                  <a href={postUrl(p.slug)}>{p.title}</a>
                </p>
                <div className="trending-item-date">
                  <CalendarIcon />
                  {fmt(p.date ? new Date(p.date) : null, locale)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
