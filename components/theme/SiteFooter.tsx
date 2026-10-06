import { getSiteContext } from "@/lib/theme/site";
import { applyShortcodes } from "@/lib/shortcodes";
import { categoryUrl } from "@/lib/urls";
import { ChevronIcon, SocialIcon, SOCIAL_LABELS } from "./icons";
import { tl } from "@/lib/i18n/public";

/** Site footer — brand + link columns + "Follow Us" card with white social icons (Customizer → Footer). */
export async function SiteFooter() {
  const ctx = await getSiteContext();
  const f = ctx.theme.footer;
  const logo = f.logo || ctx.logo;
  const socials = f.socials.filter((s) => s.url);
  const columns = f.columns
    .map((c) => ({
      title: c.title === "Categories" ? tl(c.title, "categories", ctx.t) : c.title === "Quick Links" ? tl(c.title, "quickLinks", ctx.t) : c.title,
      links: c.auto === "categories" ? ctx.categories.slice(0, 10).map((x) => ({ label: x.name, url: categoryUrl(x.slug) })) : c.links.filter((l) => l.label),
    }))
    .filter((c) => c.title || c.links.length);

  return (
    <footer className="ftx-footer" role="contentinfo">
      <div className="ftx-wrap">
        <div className="ftx-grid">
          <div className="ftx-brand">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ftx-logo" src={logo} alt={ctx.siteName} loading="lazy" decoding="async" />
            ) : (
              <span className="ftx-site-name">{ctx.siteName}</span>
            )}
            {f.description && <div className="ftx-desc" dangerouslySetInnerHTML={{ __html: applyShortcodes(f.description, ctx.sc) }} />}
          </div>

          <div className="ftx-columns">
            {columns.map((col, i) => (
              <div className="ftx-col" key={i}>
                <h2 className="ftx-heading">{col.title}</h2>
                {col.links.map((l, j) => (
                  <a className="ftx-link" href={l.url || "#"} key={j}>
                    <ChevronIcon />
                    <span>{l.label}</span>
                  </a>
                ))}
              </div>
            ))}
          </div>

          <div className="ftx-follow">
            <h2 className="ftx-heading">{tl(f.follow_title, "followUs", ctx.t)}</h2>
            {f.cta ? (
              <div className="ftx-cta-card">
                <div className="ftx-cta-text">
                  <div className="ftx-cta-title">{tl(f.cta_title, "followUsSocial", ctx.t)}</div>
                  <div className="ftx-cta-subtitle">{tl(f.cta_subtitle, "latestOnSocial", ctx.t)}</div>
                </div>
                {socials.length > 0 && (
                  <div className="ftx-social-row">
                    {socials.map((s, i) => (
                      <a key={i} className="ftx-social-btn" href={s.url} target="_blank" rel="noopener nofollow" aria-label={SOCIAL_LABELS[s.network]}>
                        <SocialIcon network={s.network} />
                      </a>
                    ))}
                  </div>
                )}
                {f.cta_button_label && f.cta_button_url && (
                  <a className="ftx-cta-btn" style={{ background: f.cta_button_color || "#25bd41" }} href={f.cta_button_url} target="_blank" rel="noopener nofollow">
                    <span>{f.cta_button_label}</span>
                  </a>
                )}
              </div>
            ) : (
              socials.length > 0 && (
                <div className="ftx-social-row">
                  {socials.map((s, i) => (
                    <a key={i} className="ftx-social-btn" href={s.url} target="_blank" rel="noopener nofollow" aria-label={SOCIAL_LABELS[s.network]}>
                      <SocialIcon network={s.network} />
                    </a>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
        <div className="ftx-copy" dangerouslySetInnerHTML={{ __html: applyShortcodes(f.copyright, ctx.sc) }} />
        {ctx.theme.consent.enabled && ctx.theme.consent.footer_link && (
          <p className="ftx-cookie">
            <button type="button" data-nb-consent="">
              {tl(ctx.theme.consent.footer_link_label, "cSettings", ctx.t)}
            </button>
          </p>
        )}
      </div>
    </footer>
  );
}
