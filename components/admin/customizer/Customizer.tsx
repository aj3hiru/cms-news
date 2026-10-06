"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ThemeSettings } from "@/lib/theme/types";
import { buildThemeCss, googleFontsHref } from "@/lib/theme/css";
import { discardThemeDraft, publishTheme, saveThemeDraft, type IdentityInput } from "@/lib/theme/actions";
import type { Device } from "./fields";
import { IdentityPanel } from "./panels/IdentityPanel";
import { ColorsPanel } from "./panels/ColorsPanel";
import { TypographyPanel } from "./panels/TypographyPanel";
import { HeaderPanel } from "./panels/HeaderPanel";
import { MenusPanel } from "./panels/MenusPanel";
import { FooterPanel } from "./panels/FooterPanel";
import { SidebarPanel } from "./panels/SidebarPanel";
import { PostPanel } from "./panels/PostPanel";
import { AlsoReadPanel } from "./panels/AlsoReadPanel";
import { ProgressPanel, ArchivePanel, ShortcodesPanel } from "./panels/MiscPanels";

export type Panel = "home" | "identity" | "colors" | "typography" | "header" | "menus" | "footer" | "sidebar" | "post" | "alsoread" | "progress" | "archive" | "shortcodes";

const PANELS: { id: Exclude<Panel, "home">; label: string; icon: string; desc: string }[] = [
  { id: "identity", label: "Site Identity", icon: "fa-id-card", desc: "Title, tagline, logo, site icon" },
  { id: "colors", label: "Colors", icon: "fa-palette", desc: "Global colors and every area of the site" },
  { id: "typography", label: "Typography", icon: "fa-font", desc: "Fonts, sizes, weights" },
  { id: "header", label: "Header", icon: "fa-window-maximize", desc: "Template, search, buttons, bell" },
  { id: "menus", label: "Menus", icon: "fa-bars", desc: "Primary menu and the menu strip" },
  { id: "footer", label: "Footer", icon: "fa-shoe-prints", desc: "Columns, social icons, copyright" },
  { id: "sidebar", label: "Sidebar", icon: "fa-table-columns", desc: "Where it shows and what it lists" },
  { id: "post", label: "Post Template", icon: "fa-file-lines", desc: "Design and sections of article pages" },
  { id: "alsoread", label: "Also Read", icon: "fa-newspaper", desc: "Related-post boxes inside articles" },
  { id: "progress", label: "Reading Progress", icon: "fa-circle-notch", desc: "Floating progress button on mobile" },
  { id: "archive", label: "Homepage & Archives", icon: "fa-table-cells-large", desc: "Post grids and lists" },
  { id: "shortcodes", label: "Shortcodes", icon: "fa-code", desc: "Codes you can use anywhere" },
];

interface Ctx {
  theme: ThemeSettings;
  update: (fn: (t: ThemeSettings) => void) => void;
  identity: IdentityInput;
  setIdentity: (patch: Partial<IdentityInput>) => void;
  device: Device;
  setDevice: (d: Device) => void;
  /** Open a page in the preview (e.g. a post when editing the post template). */
  previewPath: (path: string) => void;
}
const CustomizerCtx = createContext<Ctx | null>(null);
export function useCz(): Ctx {
  const c = useContext(CustomizerCtx);
  if (!c) throw new Error("useCz outside Customizer");
  return c;
}

/** Fields that only change CSS — they preview instantly without reloading the page. */
const CSS_ONLY: (keyof ThemeSettings)[] = ["colors", "global_colors", "typography", "fonts", "font_display"];
function structuralKey(t: ThemeSettings): string {
  const copy: Record<string, unknown> = { ...t };
  for (const k of CSS_ONLY) delete copy[k];
  return JSON.stringify(copy);
}

export function Customizer({ initial, identity: initialIdentity, siteUrl }: { initial: ThemeSettings; identity: IdentityInput; siteUrl: string }) {
  const [theme, setTheme] = useState<ThemeSettings>(initial);
  const [identity, setIdentityState] = useState<IdentityInput>(initialIdentity);
  const [panel, setPanel] = useState<Panel>("home");
  const [device, setDevice] = useState<Device>("d");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(true);

  // Two frames: the next preview loads hidden, then swaps in — no white flash.
  const frames = useRef<(HTMLIFrameElement | null)[]>([null, null]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const pathRef = useRef("/");
  const pending = useRef<number | null>(null);

  const css = useMemo(() => buildThemeCss(theme), [theme]);
  const fontsHref = useMemo(() => googleFontsHref(theme), [theme]);
  const struct = useMemo(() => structuralKey(theme) + JSON.stringify(identity), [theme, identity]);
  const lastStruct = useRef(struct);
  const cssRef = useRef({ css, fontsHref });
  useEffect(() => {
    cssRef.current = { css, fontsHref };
  }, [css, fontsHref]);

  const sendCss = useCallback((win: Window | null | undefined) => win?.postMessage({ nbCss: cssRef.current.css, nbFonts: cssRef.current.fontsHref }, location.origin), []);

  // Instant: colors / typography.
  useEffect(() => {
    for (const f of frames.current) f?.contentWindow?.postMessage({ nbCss: css, nbFonts: fontsHref }, location.origin);
  }, [css, fontsHref]);

  const loadInto = useCallback((path: string) => {
    const next = activeRef.current === 0 ? 1 : 0;
    const f = frames.current[next];
    if (!f) return;
    pending.current = next;
    setRefreshing(true);
    const sep = path.includes("?") ? "&" : "?";
    f.src = `${path}${sep}_cz=${Date.now()}`;
  }, []);

  // Everything else: save the draft, then reload the preview.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      await saveThemeDraft(theme, identity);
      if (struct !== lastStruct.current) {
        lastStruct.current = struct;
        loadInto(pathRef.current);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [theme, identity, struct, dirty, loadInto]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== location.origin || !e.data?.nbPath) return;
      const fromActive = frames.current[activeRef.current]?.contentWindow === e.source;
      if (fromActive) pathRef.current = e.data.nbPath;
    }
    addEventListener("message", onMsg);
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", warn);
    return () => {
      removeEventListener("message", onMsg);
      removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  function onFrameLoad(i: number) {
    const f = frames.current[i];
    sendCss(f?.contentWindow);
    if (pending.current === i) {
      pending.current = null;
      activeRef.current = i;
      setActive(i);
      setRefreshing(false);
      try {
        const p = f?.contentWindow?.location;
        if (p) pathRef.current = p.pathname + p.search.replace(/[?&]_cz=\d+/, "").replace(/^&/, "?");
      } catch {}
    } else if (i === activeRef.current) {
      setRefreshing(false);
      try {
        const p = f?.contentWindow?.location;
        if (p) pathRef.current = p.pathname + p.search.replace(/[?&]_cz=\d+/, "").replace(/^&/, "?");
      } catch {}
    }
  }

  const update = useCallback((fn: (t: ThemeSettings) => void) => {
    setTheme((t) => {
      const c = structuredClone(t);
      fn(c);
      return c;
    });
    setDirty(true);
    setMessage(null);
  }, []);
  const setIdentity = useCallback((patch: Partial<IdentityInput>) => {
    setIdentityState((i) => ({ ...i, ...patch }));
    setDirty(true);
    setMessage(null);
  }, []);

  async function publish() {
    setSaving(true);
    setMessage(null);
    const res = await publishTheme(theme, identity);
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setMessage({ ok: true, text: "Published — your changes are live." });
      lastStruct.current = struct;
      loadInto(pathRef.current);
    } else setMessage({ ok: false, text: res.error });
  }

  async function close() {
    if (dirty && !confirm("You have unpublished changes. Leave without publishing?")) return;
    await discardThemeDraft();
    location.href = "/admin/customize/preview?off=1&path=/admin/dashboard";
  }

  const ctx: Ctx = { theme, update, identity, setIdentity, device, setDevice, previewPath: (p) => loadInto(p) };
  const current = PANELS.find((p) => p.id === panel);

  return (
    <CustomizerCtx.Provider value={ctx}>
      <div className={`cz-root${collapsed ? " cz-collapsed" : ""}`}>
        <aside className="cz-panel" aria-hidden={collapsed}>
          <div className="cz-top">
            <button type="button" className="cz-close" title="Close" onClick={close}>
              <i className="fas fa-xmark" />
            </button>
            <span className={`cz-status${dirty ? " is-dirty" : ""}`}>{dirty ? "Unpublished changes" : "All changes published"}</span>
            <button type="button" className="cz-publish" onClick={publish} disabled={saving || !dirty}>
              {saving ? "Publishing…" : dirty ? "Publish" : "Published"}
            </button>
          </div>
          {message && <div className={`cz-msg ${message.ok ? "ok" : "err"}`}>{message.text}</div>}
          <div className="cz-head">
            {panel !== "home" && (
              <button type="button" className="cz-back" onClick={() => setPanel("home")} aria-label="Back">
                <i className="fas fa-chevron-left" />
              </button>
            )}
            <div>
              <small>{panel === "home" ? "You are customizing" : "Customizing"}</small>
              <h1>{panel === "home" ? identity.siteTitle || "Site" : current?.label}</h1>
            </div>
          </div>

          <div className="cz-body">
            {panel === "home" && (
              <nav className="cz-nav">
                {PANELS.map((p) => (
                  <button type="button" key={p.id} onClick={() => setPanel(p.id)}>
                    <span className="cz-nav-ico">
                      <i className={`fas ${p.icon}`} />
                    </span>
                    <span className="cz-nav-text">
                      <strong>{p.label}</strong>
                      <small>{p.desc}</small>
                    </span>
                    <i className="fas fa-chevron-right" />
                  </button>
                ))}
              </nav>
            )}
            {panel === "identity" && <IdentityPanel />}
            {panel === "colors" && <ColorsPanel />}
            {panel === "typography" && <TypographyPanel />}
            {panel === "header" && <HeaderPanel />}
            {panel === "menus" && <MenusPanel />}
            {panel === "footer" && <FooterPanel />}
            {panel === "sidebar" && <SidebarPanel />}
            {panel === "post" && <PostPanel />}
            {panel === "alsoread" && <AlsoReadPanel />}
            {panel === "progress" && <ProgressPanel />}
            {panel === "archive" && <ArchivePanel />}
            {panel === "shortcodes" && <ShortcodesPanel />}
          </div>

          <div className="cz-footer">
            <button type="button" onClick={() => setCollapsed(true)} className="cz-hide">
              <i className="fas fa-circle-chevron-left" /> Hide Controls
            </button>
            <span className="cz-devices">
              {(["d", "t", "m"] as Device[]).map((d) => (
                <button type="button" key={d} className={device === d ? "active" : ""} onClick={() => setDevice(d)} title={d === "d" ? "Desktop" : d === "t" ? "Tablet" : "Mobile"}>
                  <i className={`fas ${d === "d" ? "fa-desktop" : d === "t" ? "fa-tablet-screen-button" : "fa-mobile-screen-button"}`} />
                  <span>{d === "d" ? "Desktop" : d === "t" ? "Tablet" : "Mobile"}</span>
                </button>
              ))}
            </span>
          </div>
        </aside>
        {collapsed && (
          <button type="button" className="cz-show" onClick={() => setCollapsed(false)}>
            <i className="fas fa-circle-chevron-right" /> Show Controls
          </button>
        )}

        <main className="cz-preview">
          <div className="cz-preview-bar">
            <span>Preview</span>
            <button type="button" onClick={() => loadInto("/")}>
              <i className="fas fa-house" /> Homepage
            </button>
            <button type="button" onClick={() => loadInto("/admin/customize/latest-post")}>
              <i className="fas fa-file-lines" /> Latest post
            </button>
            <button type="button" onClick={() => loadInto("/categories")}>
              <i className="fas fa-folder" /> Categories
            </button>
            <button type="button" onClick={() => loadInto(pathRef.current)} title="Reload preview">
              <i className={`fas fa-rotate-right${refreshing ? " fa-spin" : ""}`} />
            </button>
            {refreshing && <span className="cz-refreshing">Updating preview…</span>}
            <a href={siteUrl} target="_blank" rel="noopener">
              Open site <i className="fas fa-arrow-up-right-from-square" />
            </a>
          </div>
          <div className={`cz-frame-wrap cz-dev-${device}`}>
            {refreshing && (
              <div className="cz-loading" aria-live="polite">
                <span className="cz-spinner" /> Loading preview…
              </div>
            )}
            {device === "m" && (
              <div className="cz-phone" aria-hidden="true">
                <span className="cz-phone-notch" />
              </div>
            )}
            {[0, 1].map((i) => (
              <iframe
                key={i}
                ref={(el) => {
                  frames.current[i] = el;
                }}
                title={i === active ? "Site preview" : "Preview (loading)"}
                className={i === active ? "is-active" : "is-buffer"}
                src={i === 0 ? "/admin/customize/preview?path=/" : "about:blank"}
                onLoad={() => onFrameLoad(i)}
              />
            ))}
          </div>
        </main>
      </div>
    </CustomizerCtx.Provider>
  );
}
