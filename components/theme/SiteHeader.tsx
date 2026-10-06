import { getSiteContext } from "@/lib/theme/site";
import { applyShortcodes, applyShortcodesText } from "@/lib/shortcodes";
import { categoryUrl } from "@/lib/urls";
import type { MenuLink } from "@/lib/theme/types";
import { SocialIcon } from "./icons";

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

function MenuItems({ items }: { items: MenuLink[] }) {
  return (
    <>
      {items.map((m, i) => {
        const subs = (m.children ?? []).filter((c) => c.label);
        return subs.length ? (
          <li className="menu-item has-mobile-submenu menu-item-has-children" key={i}>
            <a className="desktop-menu-link" href={m.url || "#"}>
              {m.label}
              <span className="nb-caret" aria-hidden="true" />
            </a>
            <button type="button" className="mobile-submenu-trigger" aria-expanded="false">
              <span>{m.label}</span>
              <span className="mobile-submenu-arrow" aria-hidden="true" />
            </button>
            <div className="mobile-submenu">
              {subs.map((s, j) => (
                <a key={j} href={s.url || "#"}>
                  {s.label}
                </a>
              ))}
            </div>
            <ul className="sub-menu">
              {subs.map((s, j) => (
                <li key={j}>
                  <a href={s.url || "#"}>{s.label}</a>
                </li>
              ))}
            </ul>
          </li>
        ) : (
          <li className="menu-item" key={i}>
            <a href={m.url || "#"}>{m.label}</a>
          </li>
        );
      })}
    </>
  );
}

const HEADER_SCRIPT = `(()=>{const d=document,b=d.body,$=(s,r=d)=>r.querySelector(s),nav=$("#site-navigation"),tg=$(".menu-toggle"),so=$(".slideout-overlay"),sm=$("#gp-search"),inp=$("#search-modal-input");if(!nav)return;
const slide=o=>{b.classList.toggle("slide-opened",o);tg&&tg.setAttribute("aria-expanded",o)};
tg&&(tg.onclick=()=>slide(!b.classList.contains("slide-opened")));so&&(so.onclick=()=>slide(!1));
const srch=o=>{if(!sm)return;sm.classList.toggle("gp-modal--open",o);o&&setTimeout(()=>inp&&inp.focus(),100)};
const ts=$("#topbarSearchForm"),mr=$("#mobileSearchRow"),mi=$("#mobile-search-input"),mc=$("#mobileSearchClose");
const ms=o=>{if(!mr)return;mr.hidden=!o;nav.classList.toggle("mobile-search-active",o);o&&setTimeout(()=>mi&&mi.focus(),50)};
ts&&ts.addEventListener("submit",e=>{if(innerWidth<=560){e.preventDefault();ms(!0)}});mc&&mc.addEventListener("click",()=>ms(!1));
d.querySelectorAll(".mobile-submenu-trigger").forEach(t=>t.addEventListener("click",()=>{const s=t.nextElementSibling,o=t.getAttribute("aria-expanded")==="true";t.setAttribute("aria-expanded",String(!o));s.classList.toggle("show",!o)}));
d.querySelectorAll("[data-gpmodal-trigger]").forEach(e=>e.onclick=v=>{v.preventDefault();srch(!0)});
sm&&(sm.onclick=e=>{e.target.hasAttribute("data-gpmodal-close")&&srch(!1)});
d.addEventListener("keydown",e=>{e.key==="Escape"&&(srch(!1),slide(!1))});
let s=0;addEventListener("scroll",()=>{const v=scrollY>0;v!==!!s&&(s=v,nav.classList.toggle("is_stuck",v))},{passive:!0});
const S=window.SpeechRecognition||window.webkitSpeechRecognition;d.querySelectorAll(".voice-icon").forEach(vb=>{const f=vb.closest("form"),i=f&&f.querySelector("input[type=search]");if(!S||!i){vb.style.display="none";return}const r=new S,p=i.placeholder;r.lang=d.documentElement.lang==="hi"?"hi-IN":"en-IN";vb.onclick=()=>{i.placeholder="Listening...";vb.classList.add("listening");try{r.start()}catch(e){}};r.onresult=e=>{i.value=e.results[0][0].transcript;i.placeholder=p;vb.classList.remove("listening");f.submit()};r.onend=()=>{vb.classList.remove("listening");i.placeholder=p}});
})();`;

/** Dark mode: Dark Reader is fetched only when a reader turns it on (same as the reference theme). */
const DARK_SCRIPT = `!function(){var e="1"===localStorage.dm,a=!1,t=!1,r=function(){return new Promise(function(e,t){var r=document.createElement("script");r.src="/assets/js/darkreader.min.js",r.onload=function(){a=!0,e()},r.onerror=t,document.head.appendChild(r)})},n=function(){DarkReader.enable({brightness:100,contrast:100,sepia:10})},l=function(){DarkReader.disable()};function o(o){if(o.preventDefault(),!t){t=!0;var d=document.querySelectorAll(".dark-mode-toggle");d.forEach(function(e){e.classList.add("loading")});(a?Promise.resolve():r()).then(function(){e=!e,localStorage.dm=e?"1":"0",e?n():l()}).finally(function(){setTimeout(function(){d.forEach(function(e){e.classList.remove("loading")}),t=!1},600)})}}e&&(a?n():r().then(n));var c=function(){document.querySelectorAll(".dark-mode-toggle").forEach(function(e){e.onclick=o})};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c()}();`;

export async function SiteHeader() {
  const ctx = await getSiteContext();
  const { theme, siteName, logo, retinaLogo, categories } = ctx;
  const h = theme.header;
  const id = theme.identity;
  const strip: MenuLink[] = h.strip_items.length ? h.strip_items : categories.map((c) => ({ label: c.name, url: categoryUrl(c.slug) }));
  const menu = h.menu;
  const showTitle = !logo || !id.hide_title;
  const socials = theme.footer.socials.filter((s) => s.url);

  return (
    <>
      {h.top_bar && h.top_bar_html && (
        <div className="nb-top-bar">
          <div className="grid-container" dangerouslySetInnerHTML={{ __html: applyShortcodes(h.top_bar_html, ctx.sc) }} />
        </div>
      )}
      <nav className={`has-branding main-navigation nav-align-right has-menu-bar-items${h.sticky ? "" : " nb-not-sticky"}`} id="site-navigation" aria-label="Primary">
        <div className="inside-navigation grid-container">
          <div className="navigation-branding">
            <div className="site-logo">
              <a href="/" title={siteName} rel="home" aria-label={`${siteName} home`}>
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
            </div>
          </div>
          <button className="menu-toggle" aria-controls="generate-slideout-menu" aria-expanded="false" aria-label="Open Menu">
            <span className="custom-menu-icon">
              <svg fill="none" viewBox="0 0 24 24" width="1.6em" height="1.6em" aria-hidden="true">
                <path d="M22 18.0048C22 18.5544 21.5544 19 21.0048 19H12.9952C12.4456 19 12 18.5544 12 18.0048C12 17.4552 12.4456 17.0096 12.9952 17.0096H21.0048C21.5544 17.0096 22 17.4552 22 18.0048Z" fill="currentColor" />
                <path d="M22 12.0002C22 12.5499 21.5544 12.9954 21.0048 12.9954H2.99519C2.44556 12.9954 2 12.5499 2 12.0002C2 11.4506 2.44556 11.0051 2.99519 11.0051H21.0048C21.5544 11.0051 22 11.4506 22 12.0002Z" fill="currentColor" />
                <path d="M21.0048 6.99039C21.5544 6.99039 22 6.54482 22 5.99519C22 5.44556 21.5544 5 21.0048 5H8.99519C8.44556 5 8 5.44556 8 5.99519C8 6.54482 8.44556 6.99039 8.99519 6.99039H21.0048Z" fill="currentColor" />
              </svg>
            </span>
          </button>
          <div id="primary-menu" className="main-nav">
            <ul id="menu-menu" className="menu sf-menu">
              <MenuItems items={menu} />
              {h.dark_mode && (
                <li className="menu-item">
                  <a href="#" className="dark-mode-toggle" role="button">
                    Dark Mode
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div className="menu-bar-items">
            {h.bell && (
              <span className="menu-bar-item">
                <a href="#" role="button" id="push-notify-btn" hidden aria-label="Enable Notifications">
                  <span className="gp-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
                      <circle cx="19" cy="5" r="3" fill="#e53935" stroke="none" />
                    </svg>
                  </span>
                </a>
              </span>
            )}
            {h.show_search && h.search_style === "inline" && (
              <span className="menu-bar-item">
                <form role="search" method="get" className="topbar-search" id="topbarSearchForm" action="/search">
                  <label htmlFor="topbar-search-input" className="screen-reader-text">
                    Search for:
                  </label>
                  <input id="topbar-search-input" type="search" name="q" placeholder={h.search_placeholder} autoComplete="off" />
                  <button type="submit" aria-label="Search">
                    <SearchGlyph />
                  </button>
                </form>
              </span>
            )}
            {h.show_search && h.search_style === "icon" && (
              <span className="menu-bar-item">
                <a href="/search" role="button" aria-label="Open search" data-gpmodal-trigger="gp-search" className="nb-search-icon">
                  <SearchGlyph />
                </a>
              </span>
            )}
          </div>
        </div>
      </nav>

      {h.show_search && h.search_style === "inline" && (
        <div className="mobile-search-row" id="mobileSearchRow" hidden>
          <form role="search" method="get" action="/search">
            <label htmlFor="mobile-search-input" className="screen-reader-text">
              Search for:
            </label>
            <input id="mobile-search-input" type="search" name="q" placeholder={h.search_placeholder} autoComplete="off" />
            <button type="submit" aria-label="Search">
              <SearchGlyph />
            </button>
            <button type="button" id="mobileSearchClose" aria-label="Close search">
              ×
            </button>
          </form>
        </div>
      )}

      {h.strip && strip.length > 0 && (
        <div className="inb-scroll-menu">
          <div className="inb-scroll-menu-inner">
            {strip.map((s, i) => (
              <a key={i} href={s.url || "#"}>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <nav id="generate-slideout-menu" className="main-navigation slideout-navigation" aria-label="Mobile Menu">
        <div className="inside-navigation">
          <div className="main-nav">
            <ul className="slideout-menu">
              <MenuItems items={menu} />
              {h.dark_mode && (
                <li className="menu-item">
                  <a href="#" className="dark-mode-toggle" role="button">
                    Dark Mode
                  </a>
                </li>
              )}
            </ul>
          </div>
          {socials.length > 0 && (
            <div className="mobile-drawer-follow">
              <div className="mobile-drawer-follow-title">{theme.footer.follow_title}</div>
              <div className="mobile-drawer-socials" aria-label="Follow us on social media">
                {socials.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener nofollow" aria-label={s.network}>
                    <SocialIcon network={s.network} className="mobile-drawer-social-icon" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
      <div className="slideout-overlay">
        <button className="slideout-exit" aria-label="Close Menu">
          ×
        </button>
      </div>

      <div className="gp-modal gp-search-modal" id="gp-search" role="dialog" aria-modal="true" aria-label="Search">
        <div className="gp-modal__overlay" data-gpmodal-close="">
          <div className="gp-modal__container">
            <form role="search" method="get" className="search-modal-form" action="/search">
              <label htmlFor="search-modal-input" className="screen-reader-text">
                Search for:
              </label>
              <div className="search-modal-fields">
                <input id="search-modal-input" type="search" className="search-field" placeholder={h.search_placeholder} name="q" required autoComplete="off" />
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
      {h.dark_mode && <script dangerouslySetInnerHTML={{ __html: DARK_SCRIPT }} />}
    </>
  );
}
