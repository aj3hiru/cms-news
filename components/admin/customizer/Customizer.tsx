"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  COLOR_GROUPS,
  SOCIAL_NETWORKS,
  TYPO_TARGETS,
  newTypoRule,
  type ColorGroupKey,
  type ThemeSettings,
  type TypoRule,
  type TypoTarget,
  type SocialNetwork,
  type ThemeFont,
} from "@/lib/theme/types";
import { buildThemeCss, googleFontsHref } from "@/lib/theme/css";
import { publishTheme, type IdentityInput } from "@/lib/theme/actions";
import { SOCIAL_LABELS } from "@/components/theme/icons";
import { ColorField, LinkList, MediaField, NumberField, ResponsiveField, Section, Select, Text, Toggle, type Device } from "./fields";

type Panel = "home" | "identity" | "colors" | "typography" | "header" | "footer" | "post" | "alsoread" | "progress" | "archive" | "shortcodes";

const PANELS: { id: Panel; label: string; icon: string }[] = [
  { id: "identity", label: "Site Identity", icon: "fa-id-card" },
  { id: "colors", label: "Colors", icon: "fa-palette" },
  { id: "typography", label: "Typography", icon: "fa-font" },
  { id: "header", label: "Header & Menu", icon: "fa-window-maximize" },
  { id: "footer", label: "Footer", icon: "fa-shoe-prints" },
  { id: "post", label: "Post Template", icon: "fa-file-lines" },
  { id: "alsoread", label: "Also Read (in posts)", icon: "fa-newspaper" },
  { id: "progress", label: "Reading Progress", icon: "fa-circle-notch" },
  { id: "archive", label: "Homepage & Archives", icon: "fa-table-cells-large" },
  { id: "shortcodes", label: "Shortcodes", icon: "fa-code" },
];

const SYSTEM_FONTS = ["System Default", "Arial", "Helvetica", "Georgia", "Times New Roman", "Verdana", "Tahoma", "Trebuchet MS"];
const GOOGLE_FONTS = [
  "Noto Sans Devanagari",
  "Noto Serif Devanagari",
  "Hind",
  "Mukta",
  "Poppins",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans 3",
  "Nunito",
  "Nunito Sans",
  "Raleway",
  "Rubik",
  "Work Sans",
  "PT Sans",
  "Merriweather",
  "Playfair Display",
  "Lora",
  "Oswald",
  "Barlow",
  "DM Sans",
  "Manrope",
  "Figtree",
  "Libre Baskerville",
  "Baloo 2",
  "Tiro Devanagari Hindi",
  "Khand",
  "Rajdhani",
  "Yatra One",
];
const WEIGHTS: [string, string][] = [["", "Default"], ...["100", "200", "300", "400", "500", "600", "700", "800", "900"].map((w) => [w, w] as [string, string]), ["normal", "Normal"], ["bold", "Bold"]];
const TYPO_GROUPS: { label: string; targets: TypoTarget[] }[] = [
  { label: "Base", targets: ["body", "buttons"] },
  { label: "Header", targets: ["site_title", "tagline"] },
  { label: "Primary Navigation", targets: ["primary_menu", "sub_menu", "menu_strip"] },
  { label: "Content", targets: ["post_title", "archive_title", "h1", "h2", "h3", "h4", "h5", "h6", "meta"] },
  { label: "Widgets & Footer", targets: ["widget_title", "footer"] },
  { label: "Custom", targets: ["custom"] },
];

export function Customizer({ initial, identity: initialIdentity, siteUrl }: { initial: ThemeSettings; identity: IdentityInput; siteUrl: string }) {
  const [theme, setTheme] = useState<ThemeSettings>(initial);
  const [identity, setIdentity] = useState<IdentityInput>(initialIdentity);
  const [panel, setPanel] = useState<Panel>("home");
  const [device, setDevice] = useState<Device>("d");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewPath, setPreviewPath] = useState("/");
  const [collapsed, setCollapsed] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  const css = useMemo(() => buildThemeCss(theme), [theme]);
  const fontsHref = useMemo(() => googleFontsHref(theme), [theme]);

  // Colors and typography preview live; everything else shows after Publish.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ nbCss: css, nbFonts: fontsHref }, location.origin);
  }, [css, fontsHref]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(fn: (t: ThemeSettings) => ThemeSettings) {
    setTheme((t) => fn(structuredClone(t)));
    setDirty(true);
    setMessage(null);
  }
  function setId(patch: Partial<IdentityInput>) {
    setIdentity((i) => ({ ...i, ...patch }));
    setDirty(true);
    setMessage(null);
  }

  async function publish() {
    setSaving(true);
    setMessage(null);
    const res = await publishTheme(theme, identity);
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setMessage({ ok: true, text: "Published" });
      const src = frame.current?.src;
      if (frame.current && src) frame.current.src = src.replace(/([?&])_cz=\d+/, "") + (src.includes("?") ? "&" : "?") + `_cz=${Date.now()}`;
    } else setMessage({ ok: false, text: res.error });
  }

  const palette = theme.global_colors;
  const pt = theme.post;
  const setPost = <K extends keyof ThemeSettings["post"]>(k: K, v: ThemeSettings["post"][K]) => update((t) => ((t.post[k] = v), t));
  const setHeader = <K extends keyof ThemeSettings["header"]>(k: K, v: ThemeSettings["header"][K]) => update((t) => ((t.header[k] = v), t));
  const setFooter = <K extends keyof ThemeSettings["footer"]>(k: K, v: ThemeSettings["footer"][K]) => update((t) => ((t.footer[k] = v), t));
  const setArchive = <K extends keyof ThemeSettings["archive"]>(k: K, v: ThemeSettings["archive"][K]) => update((t) => ((t.archive[k] = v), t));
  const fontChoices = [...SYSTEM_FONTS.slice(1), ...theme.fonts.map((f) => f.family)];

  return (
    <div className={`cz-root${collapsed ? " cz-collapsed" : ""}`}>
      <aside className="cz-panel">
        <div className="cz-top">
          <a href="/admin/dashboard" className="cz-close" title="Close">
            <i className="fas fa-xmark" />
          </a>
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
            <small>Customizing</small>
            <h1>{panel === "home" ? identity.siteTitle || "Site" : PANELS.find((p) => p.id === panel)?.label}</h1>
          </div>
        </div>

        <div className="cz-body">
          {panel === "home" && (
            <nav className="cz-nav">
              {PANELS.map((p) => (
                <button type="button" key={p.id} onClick={() => setPanel(p.id)}>
                  <i className={`fas ${p.icon}`} />
                  <span>{p.label}</span>
                  <i className="fas fa-chevron-right" />
                </button>
              ))}
              <p className="cz-note">Colors and typography preview instantly. Layout and text changes show in the preview after you press Publish.</p>
            </nav>
          )}

          {panel === "identity" && (
            <>
              <Text label="Site Title" value={identity.siteTitle} onChange={(v) => setId({ siteTitle: v })} />
              <Toggle label="Hide site title" checked={theme.identity.hide_title} onChange={(v) => update((t) => ((t.identity.hide_title = v), t))} hint="Only hidden when a logo is set." />
              <Text label="Tagline" value={identity.tagline} onChange={(v) => setId({ tagline: v })} />
              <Toggle label="Hide site tagline" checked={theme.identity.hide_tagline} onChange={(v) => update((t) => ((t.identity.hide_tagline = v), t))} />
              <MediaField label="Logo" value={identity.logo} onChange={(v) => setId({ logo: v })} />
              <MediaField label="Retina Logo" value={theme.identity.retina_logo} onChange={(v) => update((t) => ((t.identity.retina_logo = v), t))} hint="Twice the size of the logo, used on high-resolution screens." />
              <NumberField label="Logo width" unit="px" value={theme.identity.logo_width} min={40} max={400} onChange={(v) => update((t) => ((t.identity.logo_width = v), t))} />
              <NumberField label="Logo height (header)" unit="px" value={theme.header.logo_height} min={30} max={120} onChange={(v) => setHeader("logo_height", v)} />
              <MediaField label="Site Icon" value={identity.favicon} onChange={(v) => setId({ favicon: v })} hint="The Site Icon is what you see in browser tabs and bookmark bars. It should be square and at least 512 × 512 pixels." />
            </>
          )}

          {panel === "colors" && (
            <>
              <Section title="Global Colors">
                <div className="cz-palette">
                  {palette.map((g, i) => (
                    <div className="cz-palette-item" key={i}>
                      <input
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(g.color) ? g.color : "#000000"}
                        onChange={(e) => update((t) => ((t.global_colors[i].color = e.target.value), t))}
                        title={`${g.name} (--gc-${g.slug})`}
                      />
                      <input className="cz-palette-name" value={g.name} onChange={(e) => update((t) => ((t.global_colors[i].name = e.target.value), t))} />
                      {i > 6 && (
                        <button type="button" className="cz-icon-btn" onClick={() => update((t) => (t.global_colors.splice(i, 1), t))} title="Remove">
                          <i className="fas fa-xmark" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="cz-btn-outline cz-add"
                  onClick={() => update((t) => (t.global_colors.push({ slug: `custom-${Date.now().toString(36)}`, name: "Custom", color: "#888888" }), t))}
                >
                  <i className="fas fa-plus" /> Add color
                </button>
                <small className="cz-hint">Any color below can point to a global color — change it here and it updates everywhere.</small>
              </Section>
              {(Object.keys(COLOR_GROUPS) as ColorGroupKey[]).map((g) => (
                <Section key={g} title={COLOR_GROUPS[g].label} defaultOpen={g === "body"}>
                  {Object.entries(COLOR_GROUPS[g].fields).map(([f, label]) => (
                    <ColorField
                      key={f}
                      label={label as string}
                      palette={palette}
                      value={(theme.colors[g] as Record<string, string>)[f] ?? ""}
                      onChange={(v) => update((t) => (((t.colors[g] as Record<string, string>)[f] = v), t))}
                    />
                  ))}
                </Section>
              ))}
            </>
          )}

          {panel === "typography" && (
            <TypographyPanel theme={theme} update={update} device={device} setDevice={setDevice} fontChoices={fontChoices} />
          )}

          {panel === "header" && (
            <>
              <Section title="Header">
                <Toggle label="Sticky header" checked={theme.header.sticky} onChange={(v) => setHeader("sticky", v)} />
                <NumberField label="Content width" unit="px" value={theme.header.container} min={900} max={1600} onChange={(v) => setHeader("container", v)} />
                <Toggle label="Dark Mode link in menu" checked={theme.header.dark_mode} onChange={(v) => setHeader("dark_mode", v)} />
                <Toggle label="Notification bell (push)" checked={theme.header.bell} onChange={(v) => setHeader("bell", v)} />
              </Section>
              <Section title="Search">
                <Toggle label="Show search" checked={theme.header.show_search} onChange={(v) => setHeader("show_search", v)} />
                <Select
                  label="Search style"
                  value={theme.header.search_style}
                  onChange={(v) => setHeader("search_style", v)}
                  options={[
                    ["inline", "Rounded search field in the header"],
                    ["icon", "Search icon that opens a search box"],
                  ]}
                />
                <Text label="Placeholder" value={theme.header.search_placeholder} onChange={(v) => setHeader("search_placeholder", v)} />
                <Toggle label="Voice search (in the search box)" checked={theme.header.voice_search} onChange={(v) => setHeader("voice_search", v)} />
              </Section>
              <Section title="Primary Menu">
                <LinkList items={theme.header.menu} onChange={(v) => setHeader("menu", v)} nested addLabel="Add menu item" />
              </Section>
              <Section title="Menu Strip (below header)">
                <Toggle label="Show menu strip" checked={theme.header.strip} onChange={(v) => setHeader("strip", v)} />
                <small className="cz-hint">Leave empty to list every category automatically.</small>
                <LinkList items={theme.header.strip_items} onChange={(v) => setHeader("strip_items", v)} addLabel="Add link" />
              </Section>
              <Section title="Top Bar" defaultOpen={false}>
                <Toggle label="Show top bar (above header)" checked={theme.header.top_bar} onChange={(v) => setHeader("top_bar", v)} />
                <Text label="Top bar text / HTML" multiline value={theme.header.top_bar_html} onChange={(v) => setHeader("top_bar_html", v)} hint="Shortcodes work here, e.g. [site_title] · [date]" />
              </Section>
            </>
          )}

          {panel === "footer" && (
            <>
              <Section title="About">
                <MediaField label="Footer logo" value={theme.footer.logo} onChange={(v) => setFooter("logo", v)} hint="Empty = the site logo." />
                <Text label="Description" multiline value={theme.footer.description} onChange={(v) => setFooter("description", v)} hint="HTML and shortcodes allowed." />
              </Section>
              {theme.footer.columns.map((col, i) => (
                <Section key={i} title={`Column ${i + 1}: ${col.title || "untitled"}`} defaultOpen={false}>
                  <Text label="Heading" value={col.title} onChange={(v) => update((t) => ((t.footer.columns[i].title = v), t))} />
                  <Toggle
                    label="List all categories automatically"
                    checked={col.auto === "categories"}
                    onChange={(v) => update((t) => ((t.footer.columns[i].auto = v ? "categories" : ""), t))}
                  />
                  {col.auto !== "categories" && <LinkList items={col.links} onChange={(v) => update((t) => ((t.footer.columns[i].links = v), t))} />}
                  <button type="button" className="cz-btn-outline danger" onClick={() => update((t) => (t.footer.columns.splice(i, 1), t))}>
                    Remove column
                  </button>
                </Section>
              ))}
              {theme.footer.columns.length < 4 && (
                <button type="button" className="cz-btn-outline cz-add" onClick={() => update((t) => (t.footer.columns.push({ title: "Links", links: [] }), t))}>
                  <i className="fas fa-plus" /> Add link column
                </button>
              )}
              <Section title="Follow Us">
                <Text label="Heading" value={theme.footer.follow_title} onChange={(v) => setFooter("follow_title", v)} />
                <Toggle label="Show box" checked={theme.footer.cta} onChange={(v) => setFooter("cta", v)} />
                <Text label="Box title" value={theme.footer.cta_title} onChange={(v) => setFooter("cta_title", v)} />
                <Text label="Box subtitle" value={theme.footer.cta_subtitle} onChange={(v) => setFooter("cta_subtitle", v)} />
                <Text label="Button label (optional)" value={theme.footer.cta_button_label} onChange={(v) => setFooter("cta_button_label", v)} />
                <Text label="Button link" value={theme.footer.cta_button_url} onChange={(v) => setFooter("cta_button_url", v)} />
              </Section>
              <Section title="Social Networks">
                <small className="cz-hint">White icons without background. Empty links are hidden.</small>
                {theme.footer.socials.map((s, i) => (
                  <div className="cz-social" key={i}>
                    <select value={s.network} onChange={(e) => update((t) => ((t.footer.socials[i].network = e.target.value as SocialNetwork), t))}>
                      {SOCIAL_NETWORKS.map((n) => (
                        <option key={n} value={n}>
                          {SOCIAL_LABELS[n]}
                        </option>
                      ))}
                    </select>
                    <input value={s.url} placeholder="https://…" onChange={(e) => update((t) => ((t.footer.socials[i].url = e.target.value), t))} />
                    <button type="button" className="cz-icon-btn" onClick={() => update((t) => (t.footer.socials.splice(i, 1), t))} title="Remove">
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                ))}
                <button type="button" className="cz-btn-outline cz-add" onClick={() => update((t) => (t.footer.socials.push({ network: "facebook", url: "" }), t))}>
                  <i className="fas fa-plus" /> Add social network
                </button>
              </Section>
              <Section title="Copyright">
                <Text label="Copyright text" multiline value={theme.footer.copyright} onChange={(v) => setFooter("copyright", v)} hint="Shortcodes: [year] [site_title] [site_link]" />
              </Section>
            </>
          )}

          {panel === "post" && (
            <>
              <Section title="Design">
                <div className="cz-designs">
                  {(
                    [
                      ["classic", "Classic", "Breadcrumb, category badge, title, author row with Join / Follow / Google buttons"],
                      ["card", "Card header", "Title in a bordered card: category, title, author ✓, date, preferred-source button"],
                    ] as const
                  ).map(([v, l, d]) => (
                    <button type="button" key={v} className={`cz-design${pt.design === v ? " active" : ""}`} onClick={() => setPost("design", v)}>
                      <span className={`cz-design-thumb cz-design-${v}`} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <strong>{l}</strong>
                      <small>{d}</small>
                    </button>
                  ))}
                </div>
                <NumberField label="Title size" unit="px" value={pt.font_title} min={18} max={60} onChange={(v) => setPost("font_title", v)} />
                <NumberField label="Paragraph size" unit="px" value={pt.font_p} min={12} max={26} onChange={(v) => setPost("font_p", v)} />
              </Section>
              <Section title="Top of the post">
                <Toggle label="Breadcrumb (classic design)" checked={pt.breadcrumb} onChange={(v) => setPost("breadcrumb", v)} />
                <Toggle label="Category badge" checked={pt.category_badge} onChange={(v) => setPost("category_badge", v)} />
                <Toggle label="Author & date row" checked={pt.meta_row} onChange={(v) => setPost("meta_row", v)} />
                <Toggle label="Show updated date" checked={pt.show_updated_date} onChange={(v) => setPost("show_updated_date", v)} hint="Off = the first published date." />
                <Toggle label="“Add as a preferred source on Google” button" checked={pt.pill_preferred_source} onChange={(v) => setPost("pill_preferred_source", v)} />
                <Toggle label="Join Us button" checked={pt.pill_join} onChange={(v) => setPost("pill_join", v)} />
                <Text label="Join Us label" value={pt.pill_join_label} onChange={(v) => setPost("pill_join_label", v)} />
                <Text label="Join Us link (e.g. WhatsApp channel)" value={pt.pill_join_url} onChange={(v) => setPost("pill_join_url", v)} />
                <Toggle label="Follow Us button" checked={pt.pill_follow} onChange={(v) => setPost("pill_follow", v)} />
                <Text label="Follow Us label" value={pt.pill_follow_label} onChange={(v) => setPost("pill_follow_label", v)} />
                <Text label="Follow Us link (e.g. Google News)" value={pt.pill_follow_url} onChange={(v) => setPost("pill_follow_url", v)} />
                <Toggle label="Featured image" checked={pt.featured_image} onChange={(v) => setPost("featured_image", v)} />
                <Toggle label="Featured image caption (alt text)" checked={pt.featured_caption} onChange={(v) => setPost("featured_caption", v)} />
              </Section>
              <Section title="Summary & Key Points">
                <Toggle label="Summary box" checked={pt.summary} onChange={(v) => setPost("summary", v)} />
                <Text label="Summary heading" value={pt.summary_title} onChange={(v) => setPost("summary_title", v)} />
                <Toggle label="Key Points box" checked={pt.key_points} onChange={(v) => setPost("key_points", v)} />
                <Text label="Key Points heading" value={pt.key_points_title} onChange={(v) => setPost("key_points_title", v)} />
                <Select
                  label="Bullet style"
                  value={pt.key_points_style}
                  onChange={(v) => setPost("key_points_style", v)}
                  options={[
                    ["check", "✓ Check marks"],
                    ["number", "1 2 3 Numbers"],
                    ["dot", "• Dots"],
                  ]}
                />
              </Section>
              <Section title="Table of Contents">
                <Toggle label="Show table of contents" checked={pt.toc} onChange={(v) => setPost("toc", v)} hint="Built from the H2/H3 headings." />
                <Text label="Heading" value={pt.toc_title} onChange={(v) => setPost("toc_title", v)} />
                <Toggle label="Start collapsed" checked={pt.toc_collapsed} onChange={(v) => setPost("toc_collapsed", v)} />
              </Section>
              <Section title="After the content" defaultOpen={false}>
                <Toggle label="FAQs" checked={pt.faq} onChange={(v) => setPost("faq", v)} />
                <Toggle label="Tags" checked={pt.tags} onChange={(v) => setPost("tags", v)} />
                <Toggle label="Share buttons" checked={pt.share_buttons} onChange={(v) => setPost("share_buttons", v)} />
                <Toggle label="Author box" checked={pt.author_box} onChange={(v) => setPost("author_box", v)} />
                <Toggle label="Join WhatsApp / Telegram boxes" checked={pt.join_boxes} onChange={(v) => setPost("join_boxes", v)} />
                <Text label="WhatsApp link" value={pt.join_whatsapp_url} onChange={(v) => setPost("join_whatsapp_url", v)} />
                <Text label="Telegram link" value={pt.join_telegram_url} onChange={(v) => setPost("join_telegram_url", v)} />
                <Toggle label="Related posts grid" checked={pt.related} onChange={(v) => setPost("related", v)} />
                <Text label="Related heading" value={pt.related_title} onChange={(v) => setPost("related_title", v)} />
                <NumberField label="Related posts" value={pt.related_count} min={1} max={12} onChange={(v) => setPost("related_count", v)} />
                <Toggle label="Comments" checked={pt.comments} onChange={(v) => setPost("comments", v)} />
              </Section>
              <Section title="Sidebar" defaultOpen={false}>
                <Toggle label="Show sidebar" checked={pt.sidebar} onChange={(v) => setPost("sidebar", v)} />
                <Toggle label="Sticky while scrolling" checked={pt.sidebar_sticky} onChange={(v) => setPost("sidebar_sticky", v)} />
                <Text label="Heading" value={pt.sidebar_title} onChange={(v) => setPost("sidebar_title", v)} />
                <Select
                  label="Posts"
                  value={pt.sidebar_source}
                  onChange={(v) => setPost("sidebar_source", v)}
                  options={[
                    ["trending", "Trending (most viewed)"],
                    ["latest", "Latest"],
                  ]}
                />
                <NumberField label="Number of posts" value={pt.sidebar_count} min={1} max={20} onChange={(v) => setPost("sidebar_count", v)} />
              </Section>
            </>
          )}

          {panel === "alsoread" && (
            <>
              <Toggle label="Show “Also Read” inside articles" checked={pt.also_read} onChange={(v) => setPost("also_read", v)} />
              <Text label="Label" value={pt.also_read_label} onChange={(v) => setPost("also_read_label", v)} />
              <Text label="After paragraph number(s)" value={pt.also_read_after} onChange={(v) => setPost("also_read_after", v)} hint="One or more numbers, e.g. 3 or 3, 8, 14 — a card is placed after each." />
              <NumberField label="Posts per spot" value={pt.also_read_count} min={1} max={6} onChange={(v) => setPost("also_read_count", v)} />
              <Select
                label="Which posts"
                value={pt.also_read_source}
                onChange={(v) => setPost("also_read_source", v)}
                options={[
                  ["category", "Same category (falls back to latest)"],
                  ["latest", "Latest posts"],
                ]}
              />
              <span className="cz-label">Design</span>
              <div className="cz-also">
                {(
                  [
                    ["card", "Embed card", "Image, title, excerpt — like a WordPress embed"],
                    ["compact", "Compact", "Small thumbnail with title"],
                    ["accent", "Highlight bar", "Colored bar: Also Read: title"],
                    ["minimal", "Minimal line", "Text link between two lines"],
                  ] as const
                ).map(([v, l, d]) => (
                  <button type="button" key={v} className={`cz-also-opt${pt.also_read_style === v ? " active" : ""}`} onClick={() => setPost("also_read_style", v)}>
                    <span className={`cz-also-demo cz-also-demo--${v}`} aria-hidden="true">
                      <i />
                      <b />
                      <u />
                    </span>
                    <strong>{l}</strong>
                    <small>{d}</small>
                  </button>
                ))}
              </div>
              <small className="cz-hint">All four use plain links with descriptive text, so search engines follow them as normal internal links.</small>
            </>
          )}

          {panel === "progress" && (
            <>
              <Toggle label="Reading progress button" checked={pt.reading_progress} onChange={(v) => setPost("reading_progress", v)} hint="A floating button that fills as the reader scrolls and lists the article's H2 sections." />
              <Text label="Sheet title" value={pt.reading_progress_label} onChange={(v) => setPost("reading_progress_label", v)} />
              <Toggle label="Also show on desktop" checked={pt.reading_progress_desktop} onChange={(v) => setPost("reading_progress_desktop", v)} />
            </>
          )}

          {panel === "archive" && (
            <>
              <Text label="Homepage heading (optional)" value={theme.archive.home_heading} onChange={(v) => setArchive("home_heading", v)} />
              <Select
                label="Columns"
                value={String(theme.archive.columns) as "1" | "2" | "3"}
                onChange={(v) => setArchive("columns", Number(v) as 1 | 2 | 3)}
                options={[
                  ["1", "1 column"],
                  ["2", "2 columns"],
                  ["3", "3 columns"],
                ]}
              />
              <NumberField label="Posts per page" value={theme.archive.per_page} min={2} max={50} onChange={(v) => setArchive("per_page", v)} />
              <Toggle label="Show author" checked={theme.archive.show_author} onChange={(v) => setArchive("show_author", v)} />
              <Toggle label="Show date" checked={theme.archive.show_date} onChange={(v) => setArchive("show_date", v)} />
              <Toggle label="Show excerpt / summary" checked={theme.archive.show_excerpt} onChange={(v) => setArchive("show_excerpt", v)} />
              <Toggle label="Trending sidebar" checked={theme.archive.sidebar} onChange={(v) => setArchive("sidebar", v)} />
            </>
          )}

          {panel === "shortcodes" && <ShortcodesHelp />}
        </div>

        <div className="cz-footer">
          <button type="button" onClick={() => setCollapsed((c) => !c)} className="cz-hide">
            <i className={`fas fa-circle-chevron-${collapsed ? "right" : "left"}`} /> {collapsed ? "" : "Hide Controls"}
          </button>
          <span className="cz-devices">
            {(["d", "t", "m"] as Device[]).map((d) => (
              <button type="button" key={d} className={device === d ? "active" : ""} onClick={() => setDevice(d)} title={d === "d" ? "Desktop" : d === "t" ? "Tablet" : "Mobile"}>
                <i className={`fas ${d === "d" ? "fa-desktop" : d === "t" ? "fa-tablet-screen-button" : "fa-mobile-screen-button"}`} />
              </button>
            ))}
          </span>
        </div>
      </aside>

      <main className="cz-preview">
        <div className="cz-preview-bar">
          <span>Preview:</span>
          {[
            ["/", "Homepage"],
            ["__post", "Latest post"],
            ["/categories", "Categories"],
          ].map(([p, l]) => (
            <button type="button" key={p} className={previewPath === p ? "active" : ""} onClick={() => setPreviewPath(p)}>
              {l}
            </button>
          ))}
          <a href={siteUrl} target="_blank" rel="noopener">
            Open site <i className="fas fa-arrow-up-right-from-square" />
          </a>
        </div>
        <div className={`cz-frame-wrap cz-dev-${device}`}>
          <iframe
            ref={frame}
            title="Site preview"
            src={previewPath === "__post" ? "/admin/customize/latest-post" : previewPath}
            onLoad={() => frame.current?.contentWindow?.postMessage({ nbCss: css, nbFonts: fontsHref }, location.origin)}
          />
        </div>
      </main>
    </div>
  );
}

function TypographyPanel({
  theme,
  update,
  device,
  setDevice,
  fontChoices,
}: {
  theme: ThemeSettings;
  update: (fn: (t: ThemeSettings) => ThemeSettings) => void;
  device: Device;
  setDevice: (d: Device) => void;
  fontChoices: string[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [newFont, setNewFont] = useState("");
  const setRule = (id: string, patch: Partial<TypoRule>) => update((t) => ((t.typography = t.typography.map((r) => (r.id === id ? { ...r, ...patch } : r))), t));

  function addFont() {
    const family = newFont.trim();
    if (!family || theme.fonts.some((f) => f.family.toLowerCase() === family.toLowerCase())) return;
    const google = !SYSTEM_FONTS.includes(family);
    const font: ThemeFont = { family, google, variants: ["400", "500", "600", "700"], fallback: /serif|baskerville|lora|merriweather|playfair/i.test(family) ? "serif" : "sans-serif" };
    update((t) => (t.fonts.push(font), t));
    setNewFont("");
  }

  return (
    <>
      <Section title="Font Manager">
        {theme.fonts.map((f, i) => (
          <div className="cz-font" key={f.family}>
            <span style={{ fontFamily: f.family }}>{f.family}</span>
            <small>{f.google ? "Google" : "System"}</small>
            <select
              multiple
              className="cz-variants"
              value={f.variants}
              onChange={(e) => update((t) => ((t.fonts[i].variants = [...e.target.selectedOptions].map((o) => o.value)), t))}
              title="Weights to load (Ctrl/Cmd-click for several)"
            >
              {["300", "400", "500", "600", "700", "800"].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <button type="button" className="cz-icon-btn" onClick={() => update((t) => (t.fonts.splice(i, 1), t))} title="Remove font">
              <i className="fas fa-trash" />
            </button>
          </div>
        ))}
        <div className="cz-add-font">
          <input list="cz-google-fonts" value={newFont} placeholder="Font name, e.g. Poppins" onChange={(e) => setNewFont(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFont())} />
          <datalist id="cz-google-fonts">
            {[...GOOGLE_FONTS, ...SYSTEM_FONTS.slice(1)].map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          <button type="button" className="cz-btn-primary" onClick={addFont}>
            Add Font
          </button>
        </div>
        <Select
          label="Google font-display"
          value={theme.font_display}
          onChange={(v) => update((t) => ((t.font_display = v), t))}
          options={[
            ["auto", "Auto"],
            ["swap", "Swap"],
            ["block", "Block"],
            ["fallback", "Fallback"],
            ["optional", "Optional"],
          ]}
        />
      </Section>

      <Section title="Typography Manager">
        {TYPO_GROUPS.map((g) => {
          const rules = theme.typography.filter((r) => g.targets.includes(r.target));
          return (
            <div className="cz-typo-group" key={g.label}>
              <h4>{g.label}</h4>
              {rules.map((r) => (
                <div className={`cz-typo${open === r.id ? " open" : ""}`} key={r.id}>
                  <div className="cz-typo-head">
                    <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      {r.target === "custom" ? r.selector || "Custom" : TYPO_TARGETS[r.target]}
                      {r.family ? ` / ${r.family}` : ""}
                      {r.size.d ? ` / ${r.size.d}${r.sizeUnit}` : ""}
                      <i className={`fas fa-chevron-${open === r.id ? "up" : "down"}`} />
                    </button>
                    <button type="button" className="cz-icon-btn" onClick={() => update((t) => ((t.typography = t.typography.filter((x) => x.id !== r.id)), t))} title="Delete">
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                  {open === r.id && (
                    <div className="cz-typo-body">
                      <Select
                        label="Target element"
                        value={r.target}
                        onChange={(v) => setRule(r.id, { target: v })}
                        options={(Object.keys(TYPO_TARGETS) as TypoTarget[]).map((k) => [k, TYPO_TARGETS[k]])}
                      />
                      {r.target === "custom" && <Text label="CSS selector" value={r.selector} onChange={(v) => setRule(r.id, { selector: v })} placeholder=".entry-content p" />}
                      <Select label="Font family" value={r.family} onChange={(v) => setRule(r.id, { family: v })} options={[["", "Default"], ...fontChoices.map((f) => [f, f] as [string, string])]} />
                      <div className="cz-grid2">
                        <Select label="Font weight" value={r.weight} onChange={(v) => setRule(r.id, { weight: v })} options={WEIGHTS} />
                        <Select
                          label="Text transform"
                          value={r.transform}
                          onChange={(v) => setRule(r.id, { transform: v })}
                          options={[
                            ["", "Default"],
                            ["none", "None"],
                            ["uppercase", "Uppercase"],
                            ["lowercase", "Lowercase"],
                            ["capitalize", "Capitalize"],
                          ]}
                        />
                        <Select
                          label="Font style"
                          value={r.style}
                          onChange={(v) => setRule(r.id, { style: v })}
                          options={[
                            ["", "Default"],
                            ["normal", "Normal"],
                            ["italic", "Italic"],
                          ]}
                        />
                        <Select
                          label="Text decoration"
                          value={r.decoration}
                          onChange={(v) => setRule(r.id, { decoration: v })}
                          options={[
                            ["", "Default"],
                            ["none", "None"],
                            ["underline", "Underline"],
                            ["line-through", "Line through"],
                          ]}
                        />
                      </div>
                      <div className="cz-grid2">
                        <ResponsiveField label="Font size" unit={r.sizeUnit} value={r.size} onChange={(v) => setRule(r.id, { size: v })} device={device} setDevice={setDevice} />
                        <Select
                          label="Unit"
                          value={r.sizeUnit}
                          onChange={(v) => setRule(r.id, { sizeUnit: v })}
                          options={[
                            ["px", "px"],
                            ["em", "em"],
                            ["rem", "rem"],
                          ]}
                        />
                      </div>
                      <ResponsiveField label="Line height" value={r.lineHeight} onChange={(v) => setRule(r.id, { lineHeight: v })} device={device} setDevice={setDevice} />
                      <ResponsiveField label="Letter spacing" unit="em" value={r.letterSpacing} onChange={(v) => setRule(r.id, { letterSpacing: v })} device={device} setDevice={setDevice} />
                      <ResponsiveField
                        label={r.target === "body" ? "Paragraph bottom margin" : "Bottom margin"}
                        unit="em"
                        value={r.marginBottom}
                        onChange={(v) => setRule(r.id, { marginBottom: v })}
                        device={device}
                        setDevice={setDevice}
                      />
                      <button type="button" className="cz-btn-outline" onClick={() => setOpen(null)}>
                        Close
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        <button
          type="button"
          className="cz-btn-primary cz-add"
          onClick={() => {
            const used = new Set(theme.typography.map((r) => r.target));
            const next = (Object.keys(TYPO_TARGETS) as TypoTarget[]).find((k) => !used.has(k) && k !== "custom") ?? "custom";
            const rule = newTypoRule(next);
            update((t) => (t.typography.push(rule), t));
            setOpen(rule.id);
          }}
        >
          <i className="fas fa-plus" /> Add Typography
        </button>
      </Section>
    </>
  );
}

function ShortcodesHelp() {
  const codes = [
    ["[site_title]", "Site title"],
    ["[site_url]", "Site address (also [site-url])"],
    ["[site_link]", "Site title linked to the homepage"],
    ["[site_tagline]", "Tagline"],
    ["[site_domain]", "Domain only"],
    ["[contact_email]", "Admin / contact email"],
    ["[year]", "Current year"],
    ["[date]", "Today's date"],
    ["[contact_form]", "Contact form (name, email, message)"],
  ];
  return (
    <div className="cz-codes">
      <p className="cz-note">Use these anywhere: posts, pages, the footer, the top bar, SEO titles and descriptions.</p>
      {codes.map(([c, d]) => (
        <div className="cz-code" key={c}>
          <code onClick={() => navigator.clipboard?.writeText(c)} title="Click to copy">
            {c}
          </code>
          <span>{d}</span>
        </div>
      ))}
    </div>
  );
}
