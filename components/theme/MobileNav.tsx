"use client";

import { useEffect, useState } from "react";
import type { MenuLink, SocialLink } from "@/lib/theme/types";
import { SocialIcon, SOCIAL_LABELS } from "./icons";

function iconFor(item: MenuLink): string {
  const k = `${item.label} ${item.url}`.toLowerCase();
  if (item.url === "/" || /\bhome\b|होम/.test(k)) return "fa-house";
  if (k.includes("categor")) return "fa-table-cells-large";
  if (k.includes("about")) return "fa-circle-info";
  if (k.includes("contact")) return "fa-envelope";
  if (k.includes("privacy") || k.includes("policy") || k.includes("terms") || k.includes("disclaimer")) return "fa-shield-halved";
  if (k.includes("search")) return "fa-magnifying-glass";
  if (k.includes("job") || k.includes("naukri") || k.includes("भर्ती")) return "fa-briefcase";
  if (k.includes("result")) return "fa-square-poll-vertical";
  if (k.includes("news") || k.includes("ख़बर") || k.includes("खबर")) return "fa-newspaper";
  return "fa-file-lines";
}

function isActive(path: string, url: string): boolean {
  if (/^https?:/i.test(url) || url === "#") return false;
  const p = url.split(/[?#]/)[0] || "/";
  return p === "/" ? path === "/" : path === p || path.startsWith(p + "/");
}

/**
 * Hamburger + slide-in drawer in the style of sriandaltraders.co.in:
 * brand and close, a greeting with Log in / Subscribe, icon rows with
 * chevrons (current page marked), sub-menus and Categories opening in
 * place, dark mode switch, and round social icons at the bottom.
 */
export function MobileNav({
  menu,
  categories,
  siteName,
  logo,
  title,
  text,
  login,
  subscribe,
  darkMode,
  socials,
  followTitle,
  darkLabel = "Dark mode",
  buttonClass = "menu-toggle",
}: {
  darkLabel?: string;
  menu: MenuLink[];
  categories: { name: string; url: string }[];
  siteName: string;
  logo: string;
  title: string;
  text: string;
  login: { label: string; url: string } | null;
  subscribe: { label: string; url: string } | null;
  darkMode: boolean;
  socials: SocialLink[];
  followTitle: string;
  buttonClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<number | null>(null);
  // Read when the menu opens (no extra render on page load).
  const [path, setPath] = useState("/");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="nb-drawer"
        onClick={() => {
          setPath(location.pathname);
          setOpen(true);
        }}
      >
        <svg fill="none" viewBox="0 0 24 24" width="1.6em" height="1.6em" aria-hidden="true">
          <path d="M22 18.0048C22 18.5544 21.5544 19 21.0048 19H12.9952C12.4456 19 12 18.5544 12 18.0048C12 17.4552 12.4456 17.0096 12.9952 17.0096H21.0048C21.5544 17.0096 22 17.4552 22 18.0048Z" fill="currentColor" />
          <path d="M22 12.0002C22 12.5499 21.5544 12.9954 21.0048 12.9954H2.99519C2.44556 12.9954 2 12.5499 2 12.0002C2 11.4506 2.44556 11.0051 2.99519 11.0051H21.0048C21.5544 11.0051 22 11.4506 22 12.0002Z" fill="currentColor" />
          <path d="M21.0048 6.99039C21.5544 6.99039 22 6.54482 22 5.99519C22 5.44556 21.5544 5 21.0048 5H8.99519C8.44556 5 8 5.44556 8 5.99519C8 6.54482 8.44556 6.99039 8.99519 6.99039H21.0048Z" fill="currentColor" />
        </svg>
      </button>
      <div className={`mnav-overlay${open ? " open" : ""}`} role="presentation" onClick={close} />
      <aside id="nb-drawer" className={`mnav nb-drawer${open ? " open" : ""}`} aria-label="Mobile menu" aria-hidden={!open} inert={!open}>
        <div className="mnav-top">
          <a href="/" className="mnav-brand" onClick={close}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={siteName} />
            ) : (
              <span className="nb-drawer-name">{siteName}</span>
            )}
          </a>
          <button type="button" className="mnav-close" aria-label="Close menu" onClick={close}>
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="mnav-hello">
          <div className="mnav-hello-row">
            <span className="mnav-avatar">
              <i className="fas fa-user" />
            </span>
            <div className="mnav-hello-text">
              <p className="mnav-hello-title">{title || "Hello, Reader"}</p>
              {text && <p className="mnav-hello-sub">{text}</p>}
            </div>
          </div>
          {(login || subscribe) && (
            <div className="mnav-hello-btns">
              {login && (
                <a href={login.url || "#"} className="mnav-btn outline" onClick={close}>
                  <i className="fas fa-right-to-bracket" /> {login.label}
                </a>
              )}
              {subscribe && (
                <a href={subscribe.url || "#"} className="mnav-btn solid" onClick={close}>
                  <i className="fas fa-bell" /> {subscribe.label}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="mnav-gap" aria-hidden />

        <nav className="mnav-list" aria-label="Menu">
          <ul>
            {menu.map((item, i) => {
              const subs = (item.children ?? []).filter((c) => c.label);
              const isCats = !subs.length && item.url.replace(/\/+$/, "") === "/categories" && categories.length > 0;
              const children = subs.length ? subs : isCats ? categories.map((c) => ({ label: c.name, url: c.url })) : [];
              const external = /^https?:/i.test(item.url);
              const expanded = openSub === i;
              return (
                <li key={i} className={isActive(path, item.url) ? "active" : undefined}>
                  <div className="mnav-row">
                    <a href={item.url || "#"} onClick={close} className="mnav-link" target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined}>
                      <i className={`fas ${iconFor(item)} mnav-icon`} />
                      <span>{item.label}</span>
                    </a>
                    {children.length ? (
                      <button type="button" className={`mnav-chev${expanded ? " open" : ""}`} aria-expanded={expanded} aria-label={expanded ? "Close" : "Open"} onClick={() => setOpenSub(expanded ? null : i)}>
                        <i className="fas fa-chevron-down" />
                      </button>
                    ) : (
                      <i className="fas fa-chevron-right mnav-arrow" aria-hidden />
                    )}
                  </div>
                  {children.length > 0 && (
                    <ul className={`mnav-sub${expanded ? " open" : ""}`}>
                      {children.map((c, j) => (
                        <li key={j} className={isActive(path, c.url) ? "active" : undefined}>
                          <a href={c.url || "#"} onClick={close}>
                            <span>{c.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {darkMode && (
          <div className="mnav-foot">
            <a href="#" role="button" className="mnav-dark dark-mode-toggle">
              <i className="fas fa-moon mnav-icon" />
              <span>{darkLabel}</span>
              <span className="mnav-switch" aria-hidden />
            </a>
          </div>
        )}

        {socials.length > 0 && (
          <div className="nb-drawer-follow">
            <span>{followTitle}</span>
            <div>
              {socials.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener nofollow" aria-label={SOCIAL_LABELS[s.network]}>
                  <SocialIcon network={s.network} className="nb-drawer-ico" />
                </a>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
