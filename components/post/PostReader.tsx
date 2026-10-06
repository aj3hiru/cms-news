import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { AdminHtml } from "@/components/AdminHtml";
import { getPostBySlug, getRelatedPosts, estimateReadingMinutes, stripTags, type PostDetail } from "@/lib/postDetail";
import { postUrl, authorUrl, categoryUrl, tagUrl, resolveMediaUrl, staticPagePath, optimizedImage, imageSrcSet } from "@/lib/urls";
import { getAdHtmlFor, getParagraphAdBlocks, injectAfterParagraph, injectBeforeParagraph } from "@/lib/adRendering";
import { getSiteContext } from "@/lib/theme/site";
import { applyShortcodes, applyShortcodesText } from "@/lib/shortcodes";
import { addHeadingIds, alsoReadHtml, getAlsoReadPosts, parseParagraphList } from "@/lib/content/postContent";
import { getSeoSettings, formatTitle } from "@/lib/seo/settings";
import { buildPostSchema } from "@/lib/seo/schema";
import { RichContent } from "@/components/shortcodes/RichContent";
import { TrendingSidebar } from "@/components/theme/TrendingSidebar";
import { ReadingProgress } from "@/components/theme/ReadingProgress";
import { VerifiedIcon, SocialIcon } from "@/components/theme/icons";
import { ViewTracker } from "./ViewTracker";
import { ShareButtons } from "./ShareButtons";
import { CommentsSection } from "../comments/CommentsSection";

function description(post: PostDetail): string {
  return (post.seo.ogDescription || post.metaDescription || post.summary || stripTags(post.content).replace(/\s+/g, " ")).trim().slice(0, 160);
}

export async function buildPostMetadata(slug: string): Promise<Metadata> {
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const [ctx, seo] = await Promise.all([getSiteContext(), getSeoSettings()]);
  const title = applyShortcodesText(
    post.seo.title || formatTitle(seo.post_title_format, { title: post.title, sitename: ctx.siteName, sep: seo.separator }),
    ctx.sc
  );
  const desc = description(post);
  const imageUrl = post.bannerPath ? resolveMediaUrl(post.bannerPath) : seo.default_og_image ? resolveMediaUrl(seo.default_og_image) : undefined;
  const canonical = post.seo.canonical || postUrl(post.slug);
  const published = post.date ? new Date(post.date).toISOString() : undefined;
  return {
    title: { absolute: title },
    description: desc,
    keywords: post.metaKeywords?.trim() || post.seo.focusKeyword || undefined,
    alternates: { canonical },
    robots: post.seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title: post.seo.ogTitle || post.title,
      description: desc,
      url: canonical,
      siteName: ctx.siteName,
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 675, alt: post.bannerAlt || post.title }] : undefined,
      publishedTime: published,
      modifiedTime: post.updatedAt ? new Date(post.updatedAt).toISOString() : published,
      authors: [post.authorName],
      section: post.categoryName,
      tags: post.tags.map((t) => t.name),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: post.seo.ogTitle || post.title,
      description: desc,
      images: imageUrl ? [imageUrl] : undefined,
      site: seo.twitter_username ? `@${seo.twitter_username.replace(/^@/, "")}` : undefined,
    },
  };
}

const longDate = (d: Date | null) =>
  d ? new Date(d).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const shortDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");

function GoogleG() {
  return (
    <svg viewBox="-3 0 262 262" aria-hidden="true">
      <path fill="#4285F4" d="M255.878,133.451 C255.878,122.717 255.007,114.884 253.122,106.761 L130.55,106.761 L130.55,155.209 L202.497,155.209 C201.047,167.249 193.214,185.381 175.807,197.565 L175.563,199.187 L214.318,229.21 L217.003,229.478 C241.662,206.704 255.878,173.196 255.878,133.451" />
      <path fill="#34A853" d="M130.55,261.1 C165.798,261.1 195.389,249.495 217.003,229.478 L175.807,197.565 C164.783,205.253 149.987,210.62 130.55,210.62 C96.027,210.62 66.726,187.847 56.281,156.37 L54.75,156.5 L14.452,187.687 L13.925,189.152 C35.393,231.798 79.49,261.1 130.55,261.1" />
      <path fill="#FBBC05" d="M56.281,156.37 C53.525,148.247 51.93,139.543 51.93,130.55 C51.93,121.556 53.525,112.853 56.136,104.73 L56.063,103 L15.26,71.312 L13.925,71.947 C5.077,89.644 0,109.517 0,130.55 C0,151.583 5.077,171.455 13.925,189.152 L56.281,156.37" />
      <path fill="#EB4335" d="M130.55,50.479 C155.064,50.479 171.6,61.068 181.029,69.917 L217.873,33.943 C195.245,12.91 165.798,0 130.55,0 C79.49,0 35.393,29.301 13.925,71.947 L56.136,104.73 C66.726,73.253 96.027,50.479 130.55,50.479" />
    </svg>
  );
}

function GoogleNewsIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#0c9d58" d="M10 7v24c0 1.1.9 2 2 2h24c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H12c-1.1 0-2 .9-2 2z" />
      <path fill="#ea4335" d="M22.5 10.8 16.7 31.9c-.3 1 .3 2 1.3 2.3l20.9 5.8c1 .3 2-.3 2.3-1.3l5.8-21.1c.3-1-.3-2-1.3-2.3L24.8 9.5c-1-.3-2 .3-2.3 1.3z" />
      <path fill="#fbbc04" d="m1.1 18 7.5 20.5c.3 1 1.4 1.4 2.3 1.1l23.4-8.5c.9-.3 1.4-1.4 1.1-2.3L27.9 8.2c-.3-.9-1.4-1.4-2.3-1.1L2.2 15.6c-.9.4-1.4 1.4-1.1 2.4z" />
      <path fill="#4285f4" d="M6 17v24c0 1.1.9 2 2 2h32c1.1 0 2-.9 2-2V17c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2z" />
      <path fill="#fff" d="M25 25v-3h10c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H25zm0 5v-3h12c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H25zm0 5v-3h10c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H25zM10 28.5a6.5 6.5 0 0 1 11.1-4.6L19 26a3.5 3.5 0 1 0 1 3.5h-3v-1.5h6v.5a6.5 6.5 0 1 1-13 0z" />
    </svg>
  );
}

function PreferredSourceButton({ host, compact = false }: { host: string; compact?: boolean }) {
  return (
    <a
      className={`post-action-pill nb-pref-source${compact ? " nb-pref-source--card" : ""}`}
      href={`https://www.google.com/preferences/source?q=${encodeURIComponent(host)}`}
      target="_blank"
      rel="noopener nofollow"
    >
      <span className="pill-icon-google">
        <GoogleG />
      </span>
      <span className="pill-text">
        <span>Add as a preferred</span>
        <span>source on Google</span>
      </span>
      {compact && (
        <span className="nb-pref-gn">
          <GoogleNewsIcon />
        </span>
      )}
    </a>
  );
}

function Avatar({ src, name, size, className }: { src: string; name: string; size: number; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={src} alt={name} width={size} height={size} loading="lazy" decoding="async" />
  ) : (
    <span className={`nb-avatar-fallback ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4.2" fill="currentColor" />
        <path d="M3.5 21c.8-4.4 4.2-7 8.5-7s7.7 2.6 8.5 7" fill="currentColor" />
      </svg>
    </span>
  );
}

export async function PostReader({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const post = await getPostBySlug(slug, preview);
  if (!post) {
    const page = await prisma.page.findFirst({ where: { slug, status: "published" }, select: { slug: true } });
    if (page) permanentRedirect(staticPagePath(page.slug));
    notFound();
  }

  const [ctx, seo] = await Promise.all([getSiteContext(), getSeoSettings()]);
  const pt = ctx.theme.post;
  let host = ctx.siteUrl;
  try {
    host = new URL(ctx.siteUrl).host;
  } catch {}

  // Body: shortcodes → heading ids (TOC + reading progress) → "Also Read" cards → ads.
  const withIds = addHeadingIds(applyShortcodes(post.content, ctx.sc));
  let contentHtml = withIds.html;
  const headings = withIds.headings;
  const readingMinutes = estimateReadingMinutes(stripTags(contentHtml));

  const alsoSlots = parseParagraphList(pt.also_read_after);
  const alsoPer = Math.max(1, Math.min(6, pt.also_read_count));
  const [related, alsoPosts] = await Promise.all([
    pt.related ? getRelatedPosts(post.categoryId, post.id, Math.max(1, Math.min(12, pt.related_count))) : Promise.resolve([]),
    pt.also_read && alsoSlots.length ? getAlsoReadPosts(pt.also_read_source, post.categoryId, post.id, alsoPer * alsoSlots.length) : Promise.resolve([]),
  ]);

  if (alsoPosts.length) {
    const paragraphs = (contentHtml.match(/<p[\s>]/gi) ?? []).length;
    // Insert from the last slot backwards so earlier paragraph numbers stay valid.
    alsoSlots
      .map((n, i) => ({ n, posts: alsoPosts.slice(i * alsoPer, i * alsoPer + alsoPer) }))
      .filter((s) => s.n <= paragraphs && s.posts.length)
      .reverse()
      .forEach((s) => {
        const html = s.posts.map((p) => alsoReadHtml(p, pt.also_read_style, pt.also_read_label, ctx.siteName)).join("");
        contentHtml = injectAfterParagraph(contentHtml, s.n, html);
      });
  }

  const [adBeforePost, adBeforeContent, adAfterContent, adAfterPost, adBeforeComments, adAfterComments, adBeforeImg, adAfterImg, adBeforePara, adAfterPara, adFooter] =
    await Promise.all([
      getAdHtmlFor("post", "before_post"),
      getAdHtmlFor("post", "before_content"),
      getAdHtmlFor("post", "after_content"),
      getAdHtmlFor("post", "after_post"),
      getAdHtmlFor("post", "before_comments"),
      getAdHtmlFor("post", "after_comments"),
      getAdHtmlFor("post", "before_featured_image"),
      getAdHtmlFor("post", "after_featured_image"),
      getParagraphAdBlocks("post", "before_paragraph"),
      getParagraphAdBlocks("post", "after_paragraph"),
      getAdHtmlFor("post", "footer"),
    ]);
  for (const { paragraph, html } of adBeforePara) contentHtml = injectBeforeParagraph(contentHtml, paragraph, html);
  for (const { paragraph, html } of adAfterPara) contentHtml = injectAfterParagraph(contentHtml, paragraph, html);
  if (adBeforeContent) contentHtml = adBeforeContent + contentHtml;

  let faq: { q: string; a: string }[] = [];
  try {
    const parsed = post.faqJson ? JSON.parse(post.faqJson) : [];
    if (Array.isArray(parsed)) faq = parsed.filter((f) => f && f.q);
  } catch {}

  const fullUrl = `${ctx.siteUrl.replace(/\/+$/, "")}${postUrl(post.slug)}`;
  const authorImg = post.authorProfileImage ? optimizedImage(post.authorProfileImage, 128) : "";
  const schema = buildPostSchema({ post, ctx, seo, faq: pt.faq ? faq : [], url: fullUrl, description: description(post) });
  const card = pt.design === "card";
  const joinUrl = pt.pill_join_url || pt.join_whatsapp_url;
  const metaDate = pt.show_updated_date ? post.updatedAt ?? post.date : post.date;
  const authorLink = post.authorSlug ? <a href={authorUrl(post.authorSlug)}>{post.authorName}</a> : post.authorName;
  const authorSocials = (
    [
      ["instagram", post.authorSocials.instagram],
      ["threads", post.authorSocials.threads],
      ["linkedin", post.authorSocials.linkedin],
      ["facebook", post.authorSocials.facebook],
      ["x", post.authorSocials.twitter],
    ] as const
  ).filter(([, u]) => u);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <div className="container">
        <article className={`single-post nb-post nb-post--${pt.design}`}>
          <div className={`post-layout${pt.sidebar ? "" : " nb-no-sidebar"}`}>
            <div className="post-main">
              {adBeforePost && <AdminHtml html={adBeforePost} className="ad-slot ad-slot--before-post" allowFrame />}

              {card ? (
                <header className="nb-head-card">
                  {pt.category_badge && (
                    <a className="nb-head-cat" href={categoryUrl(post.categorySlug)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
                      </svg>
                      {post.categoryName}
                    </a>
                  )}
                  <h1 className="entry-title">{post.title}</h1>
                  <div className="nb-head-meta">
                    {pt.meta_row && (
                      <div className="nb-head-author">
                        <Avatar src={authorImg} name={post.authorName} size={40} />
                        <div>
                          <div className="nb-head-by">
                            By {authorLink} <VerifiedIcon />
                          </div>
                          <time className="nb-head-date" dateTime={metaDate ? new Date(metaDate).toISOString() : undefined}>
                            {shortDate(metaDate)}
                          </time>
                        </div>
                      </div>
                    )}
                    {pt.pill_preferred_source && <PreferredSourceButton host={host} compact />}
                  </div>
                </header>
              ) : (
                <>
                  {pt.breadcrumb && (
                    <nav className="breadcrumbs rank-math-breadcrumb" aria-label="Breadcrumb">
                      <p>
                        <a href="/">Home</a>
                        <span className="separator"> » </span>
                        <a href={categoryUrl(post.categorySlug)}>{post.categoryName}</a>
                        <span className="separator"> » </span>
                        <span className="last">{post.title}</span>
                      </p>
                    </nav>
                  )}
                  {pt.category_badge && (
                    <div className="post-cat-badges">
                      <a className="post-cat-badge" href={categoryUrl(post.categorySlug)}>
                        {post.categoryName}
                      </a>
                    </div>
                  )}
                  <h1 className="entry-title">{post.title}</h1>
                  {pt.meta_row && (
                    <div className="post-meta-row">
                      <div className="post-meta-author">
                        <Avatar src={authorImg} name={post.authorName} size={40} />
                        <div>
                          <div className="post-meta-by">By {authorLink}</div>
                          <div className="post-meta-date">On:&nbsp;{longDate(metaDate)}</div>
                        </div>
                      </div>
                      <div className="post-action-pills">
                        {pt.pill_join && joinUrl && (
                          <a className="post-action-pill" href={joinUrl} target="_blank" rel="noopener nofollow">
                            <span className="pill-icon-wa">
                              <SocialIcon network="whatsapp" className="nb-pill-ico" />
                            </span>
                            {pt.pill_join_label}
                          </a>
                        )}
                        {pt.pill_follow && pt.pill_follow_url && (
                          <a className="post-action-pill" href={pt.pill_follow_url} target="_blank" rel="noopener nofollow">
                            <span className="pill-icon-news">
                              <GoogleNewsIcon />
                            </span>
                            {pt.pill_follow_label}
                          </a>
                        )}
                        {pt.pill_preferred_source && <PreferredSourceButton host={host} />}
                      </div>
                    </div>
                  )}
                </>
              )}

              {adBeforeImg && <AdminHtml html={adBeforeImg} className="ad-slot ad-slot--before-featured-image" allowFrame />}
              {pt.featured_image && post.bannerPath && (
                <figure className="nb-featured">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={optimizedImage(post.bannerPath, 828)}
                    srcSet={imageSrcSet(post.bannerPath, [640, 828, 1080, 1200])}
                    sizes="(max-width: 860px) 100vw, 815px"
                    alt={post.bannerAlt ?? post.title}
                    className="post-featured-img"
                    width={1280}
                    height={720}
                    fetchPriority="high"
                    decoding="async"
                  />
                  {pt.featured_caption && post.bannerAlt && <figcaption className="post-featured-caption">{post.bannerAlt}</figcaption>}
                </figure>
              )}
              {adAfterImg && <AdminHtml html={adAfterImg} className="ad-slot ad-slot--after-featured-image" allowFrame />}

              {pt.summary && post.summary.trim() && (
                <section className="nb-summary" aria-label={pt.summary_title}>
                  <h2 className="nb-summary-title">{pt.summary_title}</h2>
                  <div className="nb-summary-text">{applyShortcodesText(post.summary, ctx.sc)}</div>
                </section>
              )}

              {pt.key_points && post.keyPoints.length > 0 && (
                <section className={`nb-keypoints nb-keypoints--${pt.key_points_style}`} aria-label={pt.key_points_title}>
                  <h2 className="nb-keypoints-title">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M9 21h6v-1H9v1Zm3-19a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2Z" />
                    </svg>
                    {pt.key_points_title}
                  </h2>
                  {pt.key_points_style === "number" ? (
                    <ol>
                      {post.keyPoints.map((k, i) => (
                        <li key={i}>{applyShortcodesText(k, ctx.sc)}</li>
                      ))}
                    </ol>
                  ) : (
                    <ul>
                      {post.keyPoints.map((k, i) => (
                        <li key={i}>{applyShortcodesText(k, ctx.sc)}</li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {pt.toc && headings.length > 1 && (
                <details className="toc nb-toc" open={!pt.toc_collapsed}>
                  <summary>
                    <span>{pt.toc_title}</span>
                    <span className="nb-toc-toggle" aria-hidden="true" />
                  </summary>
                  <ol>
                    {headings
                      .filter((h) => h.level <= 3)
                      .map((h) => (
                        <li key={h.id} className={h.level === 3 ? "nb-toc-sub" : undefined}>
                          <a href={`#${h.id}`}>{h.text}</a>
                        </li>
                      ))}
                  </ol>
                </details>
              )}

              <RichContent html={contentHtml} className="content entry-content" />

              {adAfterContent && <AdminHtml html={adAfterContent} className="ad-slot ad-slot--after-content" allowFrame />}

              {pt.faq && faq.length > 0 && (
                <div className="pst-faq-cont">
                  <h2 className="pst-faq-h">Frequently Asked Questions</h2>
                  {faq.map((item, i) => (
                    <details className="w" key={i}>
                      <summary className="q">
                        {item.q}
                        <svg className="sp" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </summary>
                      <div className="a">
                        <p>{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              )}

              {pt.tags && post.tags.length > 0 && (
                <div className="post-tags wplt-tag-badges">
                  {post.tags.map((t) => (
                    <a key={t.id} href={tagUrl(t.slug, t.id)} className="tag-link wplt-tag-badge">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="none" stroke="currentColor" strokeWidth="2" d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.58a2 2 0 0 0 0-2.83z" />
                      </svg>
                      {t.name}
                    </a>
                  ))}
                </div>
              )}

              {pt.share_buttons && <ShareButtons url={fullUrl} title={post.title} />}

              {pt.author_box && (
                <div className="author-bio">
                  <Avatar src={authorImg} name={post.authorName} size={100} className="author-bio-avatar" />
                  <div className="author-bio-content">
                    <h3>
                      {authorLink}
                      <span className="author-verified" aria-label="Verified author">
                        ✓
                      </span>
                    </h3>
                    {post.authorBio && <p>{stripTags(post.authorBio).trim()}</p>}
                    {authorSocials.length > 0 && (
                      <nav className="author-socials" aria-label={`${post.authorName} social profiles`}>
                        {authorSocials.map(([n, u]) => (
                          <a key={n} className="author-social-link" href={u!} target="_blank" rel="noopener nofollow" aria-label={n}>
                            <SocialIcon network={n} className="nb-author-ico" />
                          </a>
                        ))}
                      </nav>
                    )}
                  </div>
                </div>
              )}

              {pt.join_boxes && (pt.join_whatsapp_url || pt.join_telegram_url) && (
                <div className="post-join-boxes">
                  {pt.join_whatsapp_url && (
                    <div className="post-join-box post-join-wa">
                      <h2>
                        <SocialIcon network="whatsapp" className="nb-join-ico" />
                        Join WhatsApp
                      </h2>
                      <a className="post-join-btn" href={pt.join_whatsapp_url} target="_blank" rel="noopener nofollow">
                        Join Now
                      </a>
                    </div>
                  )}
                  {pt.join_telegram_url && (
                    <div className="post-join-box post-join-tg">
                      <h2>
                        <SocialIcon network="telegram" className="nb-join-ico" />
                        Join Telegram
                      </h2>
                      <a className="post-join-btn" href={pt.join_telegram_url} target="_blank" rel="noopener nofollow">
                        Join Now
                      </a>
                    </div>
                  )}
                </div>
              )}

              {adAfterPost && <AdminHtml html={adAfterPost} className="ad-slot ad-slot--after-post" allowFrame />}

              {pt.related && related.length > 0 && (
                <section className="more-posts-section">
                  <h2 className="more-posts-header">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {pt.related_title}
                  </h2>
                  <div className="more-posts-grid">
                    {related.map((r) => (
                      <a href={postUrl(r.slug)} className="more-posts-item" key={r.id}>
                        {r.bannerPath && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={optimizedImage(r.bannerPath, 384)} alt={r.title} loading="lazy" decoding="async" width={400} height={250} />
                        )}
                        <h3 className="more-posts-item-title">{r.title}</h3>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {adBeforeComments && <AdminHtml html={adBeforeComments} className="ad-slot ad-slot--before-comments" allowFrame />}
              {pt.comments && <CommentsSection postId={post.id} />}
              {adAfterComments && <AdminHtml html={adAfterComments} className="ad-slot ad-slot--after-comments" allowFrame />}
              {adFooter && <AdminHtml html={adFooter} className="ad-slot ad-slot--footer" allowFrame />}
            </div>
            {pt.sidebar && <TrendingSidebar excludeId={post.id} />}
          </div>
        </article>
      </div>
      {pt.reading_progress && headings.some((h) => h.level === 2) && (
        <ReadingProgress label={pt.reading_progress_label} minutes={readingMinutes} desktop={pt.reading_progress_desktop} />
      )}
      {!preview && <ViewTracker postId={post.id} slug={post.slug} />}
      {preview && <div className="nb-preview-bar">Preview — this post is not live yet</div>}
    </main>
  );
}
