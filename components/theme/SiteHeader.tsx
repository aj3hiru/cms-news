import { getSiteContext } from "@/lib/theme/site";
import { navHref } from "@/lib/theme/navHref";
import { applyShortcodes, applyShortcodesText } from "@/lib/shortcodes";
import { categoryUrl } from "@/lib/urls";
import type { MenuLink } from "@/lib/theme/types";
import { SocialIcon, SOCIAL_LABELS } from "./icons";
import { MobileNav } from "./MobileNav";
import { PushBell } from "./PushBell";
import { tl } from "@/lib/i18n/public";
import { getPushPublic } from "@/lib/push/settings";

const SEARCH_PATH =
  "M208 48c-88.366 0-160 71.634-160 160s71.634 160 160 160 160-71.634 160-160S296.366 48 208 48zM0 208C0 93.125 93.125 0 208 0s208 93.125 208 208c0 48.741-16.765 93.566-44.843 129.024l133.826 134.018c9.366 9.379 9.355 24.575-.025 33.941-9.379 9.366-24.575 9.355-33.941-.025L337.238 370.987C301.747 399.167 256.839 416 208 416 93.125 416 0 322.875 0 208z";

function SearchGlyph() {
  return (
    <span className="gp-icon">
      <svg viewBox="0 0 512 512" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d={SEARCH_PATH} />
      </svg>
    </span>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

function DesktopMenu({ items, darkMode, darkLabel }: { items: MenuLink[]; darkMode: boolean; darkLabel: string }) {
  return (
    <ul className="menu sf-menu">
      {items.map((m, i) => {
        const subs = (m.children ?? []).filter((c) => c.label);
        return (
          <li className={`menu-item${subs.length ? " menu-item-has-children" : ""}`} key={i}>
            <a href={navHref(m.url)} {...(m.newTab ? { target: "_blank", rel: "noopener" } : {})}>
              {m.label}
              {subs.length > 0 && <span className="nb-caret" aria-hidden="true" />}
            </a>
            {subs.length > 0 && (
              <ul className="sub-menu">
                {subs.map((s, j) => (
                  <li key={j}>
                    <a href={navHref(s.url)} {...(s.newTab ? { target: "_blank", rel: "noopener" } : {})}>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
      {darkMode && (
        <li className="menu-item">
          <a className="dark-mode-toggle" role="button" tabIndex={0}>
            {darkLabel}
          </a>
        </li>
      )}
    </ul>
  );
}

const HEADER_SCRIPT = `(()=>{const d=document,$=(s)=>d.querySelector(s),nav=$(".nb-header"),sm=$("#gp-search"),inp=$("#search-modal-input");if(!nav)return;
const srch=o=>{if(!sm)return;sm.classList.toggle("gp-modal--open",o);o&&setTimeout(()=>inp&&inp.focus(),100)};
const ts=$("#topbarSearchForm"),mr=$("#mobileSearchRow"),mi=$("#mobile-search-input"),mc=$("#mobileSearchClose");
const ms=o=>{if(!mr)return;mr.hidden=!o;o&&setTimeout(()=>mi&&mi.focus(),50)};
ts&&ts.addEventListener("submit",e=>{if(innerWidth<=560){e.preventDefault();ms(!0)}});mc&&mc.addEventListener("click",()=>ms(!1));
d.querySelectorAll("[data-gpmodal-trigger]").forEach(e=>e.addEventListener("click",v=>{v.preventDefault();srch(!0)}));
sm&&sm.addEventListener("click",e=>{e.target.hasAttribute("data-gpmodal-close")&&srch(!1)});
d.addEventListener("keydown",e=>{e.key==="Escape"&&srch(!1)});
let s=0;addEventListener("scroll",()=>{const v=scrollY>0;v!==!!s&&(s=v,nav.classList.toggle("is_stuck",v))},{passive:!0});
const S=window.SpeechRecognition||window.webkitSpeechRecognition;d.querySelectorAll(".voice-icon").forEach(vb=>{const f=vb.closest("form"),i=f&&f.querySelector("input[type=search]");if(!S||!i){vb.style.display="none";return}const r=new S,p=i.placeholder;r.lang=d.documentElement.lang||"en-IN";vb.onclick=()=>{i.placeholder="Listening...";vb.classList.add("listening");try{r.start()}catch(e){}};r.onresult=e=>{i.value=e.results[0][0].transcript;i.placeholder=p;vb.classList.remove("listening");f.submit()};r.onend=()=>{vb.classList.remove("listening");i.placeholder=p}});
})();`;

/** Readers who already subscribed: hide the bell before the first paint. */
const PUSH_EARLY = `try{if(localStorage.getItem("push_vapid_key")&&window.Notification&&Notification.permission==="granted")document.documentElement.classList.add("nb-push-sub")}catch(e){}`;

/** Dark mode: Dark Reader is fetched only when a reader turns it on (same as the reference theme). */
const DARK_SCRIPT = `!function(){var e="1"===localStorage.dm,a=!1,t=!1,r=function(){return new Promise(function(e,t){var r=document.createElement("script");r.src="/assets/js/darkreader.min.js",r.onload=function(){a=!0,e()},r.onerror=t,document.head.appendChild(r)})},n=function(){DarkReader.enable({brightness:100,contrast:100,sepia:10})},l=function(){DarkReader.disable()};function o(o){if(o.preventDefault(),!t){t=!0;var d=document.querySelectorAll(".dark-mode-toggle");d.forEach(function(e){e.classList.add("loading")});(a?Promise.resolve():r()).then(function(){e=!e,localStorage.dm=e?"1":"0",e?n():l();document.querySelectorAll(".dark-mode-toggle").forEach(function(x){x.classList.toggle("is-on",e)})}).finally(function(){setTimeout(function(){d.forEach(function(e){e.classList.remove("loading")}),t=!1},600)})}}e&&(a?n():r().then(n));var c=function(){document.querySelectorAll(".dark-mode-toggle").forEach(function(x){x.onclick=o})};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c()}();`;

export async function SiteHeader() {
  const [ctx, push] = await Promise.all([getSiteContext(), getPushPublic()]);
  const { theme, siteName, logo, retinaLogo, categories } = ctx;
  const h = theme.header;
  const id = theme.identity;
  const racing = h.template === "racing";
  const t = ctx.t;
  const placeholder = tl(h.search_placeholder, "searchPlaceholder", t);
  // Untouched default menu labels follow the site language.
  const menu: MenuLink[] = h.menu.map((m) => (m.label === "Home" ? { ...m, label: t.home } : m.label === "Categories" ? { ...m, label: t.categories } : m));
  const strip: MenuLink[] = h.strip_source === "custom" ? h.strip_items.filter((s) => s.label) : categories.map((c) => ({ label: c.name, url: categoryUrl(c.slug) }));
  const socials = theme.footer.socials.filter((s) => s.url);
  const showTitle = !logo || !id.hide_title;
  const login = racing && h.show_login ? { label: tl(h.login_label, "logIn", t), url: h.login_url } : null;
  const subscribe = racing && h.show_subscribe ? { label: tl(h.subscribe_label, "subscribe", t), url: h.subscribe_url } : null;

  const brand = (
    <a href="/" title={siteName} rel="home" aria-label={`${siteName} home`} className="nb-brand-link">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="header-image is-logo-image"
          src={logo}
          srcSet={retinaLogo ? `${logo} 1x, ${retinaLogo} 2x` : undefined}
          alt={siteName}
          width={id.logo_width || 146}
          height={h.logo_height || 50}
          fetchPriority="high"
        />
      )}
      {showTitle && (
        <span className="nb-site-branding">
          <span className="site-title">{siteName}</span>
          {!id.hide_tagline && ctx.tagline && <span className="site-tagline">{applyShortcodesText(ctx.tagline, ctx.sc)}</span>}
        </span>
      )}
    </a>
  );

  const mobileNav = (
    <MobileNav
      menu={menu}
      categories={categories.map((c) => ({ name: c.name, url: categoryUrl(c.slug) }))}
      siteName={siteName}
      logo={logo}
      title={tl(h.drawer_title, "helloReader", t)}
      text={h.drawer_text || applyShortcodesText(ctx.tagline, ctx.sc)}
      login={login}
      subscribe={subscribe}
      darkMode={h.dark_mode}
      socials={socials}
      followTitle={tl(theme.footer.follow_title, "followUs", t)}
      darkLabel={t.darkMode}
      buttonClass={racing ? "nb-burger" : "menu-toggle"}
    />
  );

  const searchIcon = h.show_search && (
    <a href="/search" role="button" aria-label={t.search} data-gpmodal-trigger="gp-search" className="nb-search-icon">
      <SearchGlyph />
    </a>
  );

  const stripNav = strip.length > 0 && (
    <div className={`inb-scroll-menu nb-strip nb-strip--${h.strip_style} nb-strip--${h.strip_align}`}>
      <div className="inb-scroll-menu-inner">
        {strip.map((s, i) => (
          <a key={i} href={navHref(s.url)} {...(s.newTab ? { target: "_blank", rel: "noopener" } : {})}>
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {h.top_bar && h.top_bar_html && (
        <div className="nb-top-bar">
          <div className="grid-container" dangerouslySetInnerHTML={{ __html: applyShortcodes(h.top_bar_html, ctx.sc) }} />
        </div>
      )}

      {racing ? (
        <header className={`nb-header nb-h-racing${h.sticky ? " is-sticky" : ""}`} id="site-navigation">
          <div className="nb-hr-top">
            <nav className="nb-hr-soc" aria-label="Social networks">
              {h.header_socials &&
                socials.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener nofollow" aria-label={SOCIAL_LABELS[s.network]}>
                    <SocialIcon network={s.network} className="nb-hr-soc-ico" />
                  </a>
                ))}
            </nav>
            <div className="nb-hr-brand">{brand}</div>
            <div className="nb-hr-act">
              {h.bell && <PushBell ready={push.bell} className="nb-hr-bell" labels={{ get: t.getNotifications, enabled: t.notificationsEnabled, blocked: t.notificationsBlocked, help: t.notificationsHelp }} />}
              {searchIcon}
              {login && (
                <a className="nb-hr-login" href={navHref(login.url)}>
                  <UserIcon />
                  <span>{login.label}</span>
                </a>
              )}
              {login && subscribe && <span className="nb-hr-div" aria-hidden="true" />}
              {subscribe && (
                <a className="nb-hr-sub" href={navHref(subscribe.url)}>
                  {subscribe.label}
                </a>
              )}
              {mobileNav}
            </div>
          </div>
          {h.strip && stripNav && (
            <nav className="nb-hr-nav" aria-label="Main navigation">
              {stripNav}
            </nav>
          )}
        </header>
      ) : (
        <>
          <nav className={`nb-header has-branding main-navigation nav-align-right has-menu-bar-items${h.sticky ? "" : " nb-not-sticky"}`} id="site-navigation" aria-label="Primary">
            <div className="inside-navigation grid-container">
              <div className="navigation-branding">
                <div className="site-logo">{brand}</div>
              </div>
              <div id="primary-menu" className="main-nav">
                <DesktopMenu items={menu} darkMode={h.dark_mode} darkLabel={t.darkMode} />
              </div>
              <div className="menu-bar-items">
                {h.bell && (
                  <span className="menu-bar-item">
                    <PushBell ready={push.bell} labels={{ get: t.getNotifications, enabled: t.notificationsEnabled, blocked: t.notificationsBlocked, help: t.notificationsHelp }} />
                  </span>
                )}
                {h.show_search && h.search_style === "inline" && (
                  <span className="menu-bar-item nb-inline-search">
                    <form role="search" method="get" className="topbar-search" id="topbarSearchForm" action="/search">
                      <label htmlFor="topbar-search-input" className="screen-reader-text">
                        {t.searchFor}
                      </label>
                      <input id="topbar-search-input" type="search" name="q" placeholder={placeholder} autoComplete="off" />
                      <button type="submit" aria-label="Search">
                        <SearchGlyph />
                      </button>
                    </form>
                  </span>
                )}
                {h.show_search && h.search_style === "icon" && <span className="menu-bar-item">{searchIcon}</span>}
                {(login || subscribe) && (
                  <span className="menu-bar-item nb-hc-auth">
                    {login && (
                      <a className="nb-hc-login" href={navHref(login.url)}>
                        <UserIcon />
                        <span>{login.label}</span>
                      </a>
                    )}
                    {subscribe && (
                      <a className="nb-hc-sub" href={navHref(subscribe.url)}>
                        {subscribe.label}
                      </a>
                    )}
                  </span>
                )}
                <span className="menu-bar-item nb-hc-burger">{mobileNav}</span>
              </div>
            </div>
          </nav>
          {h.show_search && h.search_style === "inline" && (
            <div className="mobile-search-row" id="mobileSearchRow" hidden>
              <form role="search" method="get" action="/search">
                <label htmlFor="mobile-search-input" className="screen-reader-text">
                  {t.searchFor}
                </label>
                <input id="mobile-search-input" type="search" name="q" placeholder={placeholder} autoComplete="off" />
                <button type="submit" aria-label="Search">
                  <SearchGlyph />
                </button>
                <button type="button" id="mobileSearchClose" aria-label="Close search">
                  ×
                </button>
              </form>
            </div>
          )}
          {h.strip && stripNav}
        </>
      )}

      <div className="gp-modal gp-search-modal" id="gp-search" role="dialog" aria-modal="true" aria-label="Search">
        <div className="gp-modal__overlay" data-gpmodal-close="">
          <div className="gp-modal__container">
            <form role="search" method="get" className="search-modal-form" action="/search">
              <label htmlFor="search-modal-input" className="screen-reader-text">
                {t.searchFor}
              </label>
              <div className="search-modal-fields">
                <input id="search-modal-input" type="search" className="search-field" placeholder={placeholder} name="q" required autoComplete="off" />
                {h.voice_search && (
                  <button type="button" className="voice-icon" aria-label="Voice search">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 19v3" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <rect x="9" y="2" width="6" height="13" rx="3" />
                    </svg>
                  </button>
                )}
                <button type="submit" aria-label="Search">
                  <SearchGlyph />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: HEADER_SCRIPT }} />
      {h.bell && push.bell && <script dangerouslySetInnerHTML={{ __html: PUSH_EARLY }} />}
      {h.dark_mode && <script dangerouslySetInnerHTML={{ __html: DARK_SCRIPT }} />}
    </>
  );
}
