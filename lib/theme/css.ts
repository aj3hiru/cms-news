import { COLOR_GROUPS, type ColorGroupKey, type ThemeSettings, type TypoRule, type TypoTarget } from "./types";

/** Where each Typography target applies on the public site. */
export const TYPO_SELECTORS: Record<Exclude<TypoTarget, "custom">, string> = {
  body: "body",
  site_title: ".site-title",
  tagline: ".site-tagline",
  primary_menu: "#site-navigation .main-nav > ul > li > a",
  sub_menu: "#site-navigation .main-nav ul ul a",
  menu_strip: ".inb-scroll-menu a",
  buttons: ".nb-btn, .post-join-btn, .blog-comment-submit-btn, .wp-block-button__link, .cf-submit",
  post_title: ".single-post h1.entry-title",
  archive_title: ".nb-card-title, .more-posts-item-title",
  h1: ".entry-content h1",
  h2: ".entry-content h2",
  h3: ".entry-content h3",
  h4: ".entry-content h4",
  h5: ".entry-content h5",
  h6: ".entry-content h6",
  meta: ".post-meta-row, .nb-card-meta, .trending-item-date",
  widget_title: ".trending-box-header h2, .widget-title",
  footer: ".ftx-footer",
};

const SAFE_VALUE = /^[#(),.%\-\w\s'"/]*$/;
function clean(v: string | undefined): string {
  const s = (v ?? "").trim();
  return s && SAFE_VALUE.test(s) && !/[{};<>]/.test(s) ? s : "";
}

/** A color value: "#hex", "rgba(..)", or a global color slug written as "var(--gc-slug)". */
function color(v: string): string {
  return clean(v);
}

export function colorVar(group: ColorGroupKey, field: string): string {
  return `--t-${group.replace(/_/g, "-")}-${field.replace(/_/g, "-")}`;
}

function familyCss(family: string, theme: ThemeSettings): string {
  const f = clean(family);
  if (!f) return "";
  const font = theme.fonts.find((x) => x.family === f);
  const fallback = font?.fallback || "sans-serif";
  return /\s/.test(f) ? `"${f}", ${fallback}` : `${f}, ${fallback}`;
}

function ruleDecls(r: TypoRule, bp: "d" | "t" | "m", theme: ThemeSettings): string {
  const out: string[] = [];
  if (bp === "d") {
    const fam = familyCss(r.family, theme);
    if (fam) out.push(`font-family:${fam}`);
    if (clean(r.weight)) out.push(`font-weight:${clean(r.weight)}`);
    if (clean(r.transform)) out.push(`text-transform:${clean(r.transform)}`);
    if (clean(r.style)) out.push(`font-style:${clean(r.style)}`);
    if (clean(r.decoration)) out.push(`text-decoration:${clean(r.decoration)}`);
  }
  const unit = r.sizeUnit || "px";
  const size = clean(r.size?.[bp]);
  if (size) out.push(`font-size:${size}${/^[\d.]+$/.test(size) ? unit : ""}`);
  const lh = clean(r.lineHeight?.[bp]);
  if (lh) out.push(`line-height:${lh}`);
  const ls = clean(r.letterSpacing?.[bp]);
  if (ls) out.push(`letter-spacing:${ls}${/^-?[\d.]+$/.test(ls) ? "em" : ""}`);
  const mb = clean(r.marginBottom?.[bp]);
  if (mb) {
    const v = `${mb}${/^[\d.]+$/.test(mb) ? "em" : ""}`;
    // The body rule's "Paragraph Bottom Margin" applies to paragraphs, like the WP customizer.
    if (r.target !== "body") out.push(`margin-bottom:${v}`);
  }
  return out.join(";");
}

function selectorFor(r: TypoRule): string {
  if (r.target === "custom") {
    const s = (r.selector ?? "").trim();
    return s && !/[{}<>;]/.test(s) ? s : "";
  }
  return TYPO_SELECTORS[r.target];
}

/** Google Fonts stylesheet URL for every Google font in the Font Manager. */
export function googleFontsHref(theme: ThemeSettings): string | null {
  const fams = theme.fonts.filter((f) => f.google && clean(f.family));
  if (!fams.length) return null;
  const q = fams
    .map((f) => {
      const ws = [...new Set((f.variants.length ? f.variants : ["400", "700"]).map((v) => v.replace(/\D/g, "")).filter(Boolean))].sort();
      return `family=${encodeURIComponent(f.family).replace(/%20/g, "+")}:wght@${ws.join(";")}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=${theme.font_display === "auto" ? "swap" : theme.font_display}`;
}

/** All Customizer colors + typography as one stylesheet (inlined in <head>). */
export function buildThemeCss(theme: ThemeSettings): string {
  const vars: string[] = [];
  for (const g of theme.global_colors) {
    const slug = g.slug.replace(/[^\w-]/g, "");
    if (slug && color(g.color)) vars.push(`--gc-${slug}:${color(g.color)}`);
  }
  for (const group of Object.keys(COLOR_GROUPS) as ColorGroupKey[]) {
    const vals = theme.colors[group] as Record<string, string>;
    for (const [field, v] of Object.entries(vals)) {
      const c = color(v);
      if (c) vars.push(`${colorVar(group, field)}:${c}`);
    }
  }
  // The body font also drives the theme's own font variables (headings, UI), like the WP customizer.
  const bodyRule = theme.typography.find((r) => r.target === "body" && clean(r.family));
  if (bodyRule) {
    const fam = familyCss(bodyRule.family, theme);
    vars.push(`--font-body:${fam}`, `--font-heading:${fam}`, `--font-ui:${fam}`);
  }
  vars.push(`--hd-h:${Math.max(30, Math.min(120, theme.header.logo_height || 50))}px`);
  vars.push(`--nb-container:${Math.max(900, Math.min(1600, theme.header.container || 1200))}px`);
  vars.push(`--pt-title-size:${theme.post.font_title}px`);
  vars.push(`--pt-p-size:${theme.post.font_p}px`);

  let css = `:root{${vars.join(";")}}\n`;
  const bps: { bp: "d" | "t" | "m"; open: string; close: string }[] = [
    { bp: "d", open: "", close: "" },
    { bp: "t", open: "@media (max-width:1024px){", close: "}" },
    { bp: "m", open: "@media (max-width:767px){", close: "}" },
  ];
  for (const { bp, open, close } of bps) {
    let block = "";
    for (const r of theme.typography) {
      const sel = selectorFor(r);
      if (!sel) continue;
      const decls = ruleDecls(r, bp, theme);
      if (decls) block += `${sel}{${decls}}`;
      const pm = r.target === "body" ? clean(r.marginBottom?.[bp]) : "";
      if (pm) block += `.entry-content p{margin-bottom:${pm}${/^[\d.]+$/.test(pm) ? "em" : ""}}`;
    }
    if (block) css += open + block + close + "\n";
  }
  return css;
}
