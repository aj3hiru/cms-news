/**
 * Theme settings — everything the Customizer controls, saved as one JSON
 * value in app_config ("theme_settings"). Every field has a default here,
 * so a partial or older saved value always merges into a complete object.
 */

export type Responsive<T> = { d: T; t: T; m: T };

export interface MenuLink {
  label: string;
  url: string;
  children?: MenuLink[];
}

export interface SocialLink {
  network: SocialNetwork;
  url: string;
}

export const SOCIAL_NETWORKS = [
  "facebook",
  "x",
  "instagram",
  "youtube",
  "threads",
  "linkedin",
  "pinterest",
  "telegram",
  "whatsapp",
  "reddit",
  "tumblr",
  "snapchat",
  "tiktok",
  "google-news",
  "rss",
  "email",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/* ── Colors (WordPress / GeneratePress customizer groups) ─────────── */

export const COLOR_GROUPS = {
  body: { label: "Body", fields: { background: "Background", text: "Text", link: "Link", link_hover: "Link Hover" } },
  top_bar: { label: "Top Bar", fields: { background: "Background", text: "Text", link: "Link", link_hover: "Link Hover" } },
  header: {
    label: "Header",
    fields: { background: "Background", text: "Text", link: "Link", link_hover: "Link Hover", site_title: "Site Title", tagline: "Tagline" },
  },
  primary_nav: {
    label: "Primary Navigation",
    fields: {
      nav_bg: "Navigation Background",
      nav_bg_hover: "Navigation Background Hover",
      nav_bg_current: "Navigation Background Current",
      nav_text: "Navigation Text",
      nav_text_hover: "Navigation Text Hover",
      nav_text_current: "Navigation Text Current",
      sub_bg: "Sub-Menu Background",
      sub_bg_hover: "Sub-Menu Background Hover",
      sub_text: "Sub-Menu Text",
      sub_text_hover: "Sub-Menu Text Hover",
    },
  },
  menu_strip: { label: "Menu Strip (below header)", fields: { background: "Background", text: "Text", text_hover: "Text Hover" } },
  off_canvas: {
    label: "Off Canvas Panel",
    fields: { background: "Background", text: "Text", background_hover: "Item Background Hover", sub_bg: "Sub-Menu Background" },
  },
  buttons: { label: "Buttons", fields: { background: "Background", background_hover: "Background Hover", text: "Text", text_hover: "Text Hover" } },
  content: {
    label: "Content",
    fields: {
      background: "Background",
      text: "Text",
      link: "Link",
      link_hover: "Link Hover",
      title: "Content Title",
      archive_title: "Archive Content Title",
      archive_title_hover: "Archive Content Title Hover",
      meta_text: "Entry Meta Text",
      meta_link: "Entry Meta Links",
      meta_link_hover: "Entry Meta Links Hover",
      h1: "Heading 1 (H1) Color",
      h2: "Heading 2 (H2) Color",
      h3: "Heading 3 (H3) Color",
      h4: "Heading 4 (H4) Color",
      h5: "Heading 5 (H5) Color",
      h6: "Heading 6 (H6) Color",
    },
  },
  forms: {
    label: "Forms",
    fields: {
      field_bg: "Form Background",
      field_bg_focus: "Form Background Focus",
      field_text: "Form Text",
      field_text_focus: "Form Text Focus",
      field_border: "Form Border",
      field_border_focus: "Form Border Focus",
    },
  },
  sidebar: { label: "Sidebar Widgets", fields: { background: "Background", text: "Text", link: "Link", link_hover: "Link Hover", title: "Widget Title", title_bg: "Widget Title Background" } },
  footer_widgets: { label: "Footer Widgets", fields: { background: "Background", text: "Text", link: "Link", link_hover: "Link Hover", title: "Widget Title", accent: "Heading Underline" } },
  footer_bar: { label: "Footer Bar", fields: { background: "Background", text: "Text", link: "Link", link_hover: "Link Hover" } },
  search_modal: { label: "Search Modal", fields: { field_bg: "Field Background", field_text: "Field Text", overlay_bg: "Overlay Background" } },
} as const;

export type ColorGroupKey = keyof typeof COLOR_GROUPS;
export type ThemeColors = { -readonly [G in ColorGroupKey]: { -readonly [F in keyof (typeof COLOR_GROUPS)[G]["fields"]]: string } };

export interface GlobalColor {
  slug: string;
  name: string;
  color: string;
}

/* ── Typography ────────────────────────────────────────────────── */

export const TYPO_TARGETS = {
  body: "Body",
  site_title: "Site Title",
  tagline: "Site Tagline",
  primary_menu: "Primary Menu Items",
  sub_menu: "Primary Sub-Menu Items",
  menu_strip: "Menu Strip Items",
  buttons: "Buttons",
  post_title: "Single Content Title (H1)",
  archive_title: "Archive Content Title",
  h1: "Heading 1 (H1)",
  h2: "Heading 2 (H2)",
  h3: "Heading 3 (H3)",
  h4: "Heading 4 (H4)",
  h5: "Heading 5 (H5)",
  h6: "Heading 6 (H6)",
  meta: "Entry Meta",
  widget_title: "Widget Titles",
  footer: "Footer",
  custom: "Custom selector",
} as const;
export type TypoTarget = keyof typeof TYPO_TARGETS;

export interface TypoRule {
  id: string;
  target: TypoTarget;
  /** Only used when target is "custom". */
  selector: string;
  family: string;
  weight: string;
  transform: string;
  style: string;
  decoration: string;
  size: Responsive<string>;
  sizeUnit: "px" | "em" | "rem";
  lineHeight: Responsive<string>;
  letterSpacing: Responsive<string>;
  marginBottom: Responsive<string>;
}

export interface ThemeFont {
  family: string;
  /** Loaded from Google Fonts. False = a system/local font already on the device. */
  google: boolean;
  variants: string[];
  fallback: string;
}

/* ── Post template ─────────────────────────────────────────────── */

export type PostDesign = "classic" | "card";
export type AlsoReadStyle = "card" | "compact" | "accent" | "minimal";

export interface PostTemplate {
  design: PostDesign;
  breadcrumb: boolean;
  category_badge: boolean;
  meta_row: boolean;
  show_updated_date: boolean;
  pill_join: boolean;
  pill_join_label: string;
  pill_join_url: string;
  pill_follow: boolean;
  pill_follow_label: string;
  pill_follow_url: string;
  pill_preferred_source: boolean;
  /** Card design: Google News icon box next to the preferred-source button (links to the Follow URL). */
  card_gn_box: boolean;
  featured_image: boolean;
  featured_caption: boolean;
  summary: boolean;
  summary_title: string;
  key_points: boolean;
  key_points_title: string;
  key_points_style: "check" | "number" | "dot";
  toc: boolean;
  toc_title: string;
  toc_collapsed: boolean;
  tags: boolean;
  author_box: boolean;
  join_boxes: boolean;
  join_whatsapp_url: string;
  join_telegram_url: string;
  related: boolean;
  related_title: string;
  related_count: number;
  faq: boolean;
  share_buttons: boolean;
  comments: boolean;
  sidebar: boolean;
  sidebar_title: string;
  sidebar_count: number;
  sidebar_source: "trending" | "latest";
  sidebar_sticky: boolean;
  reading_progress: boolean;
  reading_progress_label: string;
  reading_progress_desktop: boolean;
  also_read: boolean;
  also_read_label: string;
  also_read_style: AlsoReadStyle;
  also_read_source: "category" | "latest";
  /** Paragraph numbers to place an "Also Read" card after, e.g. "3, 7". */
  also_read_after: string;
  also_read_count: number;
  font_title: number;
  font_p: number;
}

/* ── Whole theme ───────────────────────────────────────────────── */

export interface ThemeSettings {
  identity: {
    hide_title: boolean;
    hide_tagline: boolean;
    retina_logo: string;
    logo_width: number;
    site_icon: string;
  };
  global_colors: GlobalColor[];
  colors: ThemeColors;
  fonts: ThemeFont[];
  font_display: "auto" | "swap" | "block" | "fallback" | "optional";
  typography: TypoRule[];
  header: {
    sticky: boolean;
    logo_height: number;
    menu: MenuLink[];
    show_search: boolean;
    /** "inline": rounded search field in the bar; "icon": a search icon that opens the search modal. */
    search_style: "inline" | "icon";
    search_placeholder: string;
    voice_search: boolean;
    dark_mode: boolean;
    bell: boolean;
    top_bar: boolean;
    top_bar_html: string;
    strip: boolean;
    strip_items: MenuLink[];
    container: number;
  };
  footer: {
    logo: string;
    description: string;
    /** auto = "categories": the column lists every category (links ignored). */
    columns: { title: string; links: MenuLink[]; auto?: "categories" | "" }[];
    follow_title: string;
    cta: boolean;
    cta_title: string;
    cta_subtitle: string;
    cta_button_label: string;
    cta_button_url: string;
    cta_button_color: string;
    socials: SocialLink[];
    copyright: string;
    style: "classic" | "card";
  };
  post: PostTemplate;
  archive: {
    columns: 1 | 2 | 3;
    per_page: number;
    show_author: boolean;
    show_date: boolean;
    show_excerpt: boolean;
    sidebar: boolean;
    home_heading: string;
  };
}

export const DEFAULT_GLOBAL_COLORS: GlobalColor[] = [
  { slug: "base-3", name: "White", color: "#ffffff" },
  { slug: "contrast", name: "Contrast", color: "#222222" },
  { slug: "contrast-2", name: "Contrast 2", color: "#373737" },
  { slug: "accent-2", name: "Blue", color: "#1e73be" },
  { slug: "accent", name: "Accent", color: "#0c6878" },
  { slug: "accent-3", name: "Red", color: "#d50808" },
  { slug: "base", name: "Base", color: "#e1e1e1" },
];

function emptyColors(): ThemeColors {
  const out = {} as Record<string, Record<string, string>>;
  for (const [g, def] of Object.entries(COLOR_GROUPS)) {
    out[g] = Object.fromEntries(Object.keys(def.fields).map((f) => [f, ""]));
  }
  return out as ThemeColors;
}

/** Colors that reproduce the reference (EduMint24 / GeneratePress teal) design. */
export function defaultColors(): ThemeColors {
  const c = emptyColors();
  c.body.background = "#ffffff";
  c.body.text = "#373737";
  c.body.link = "#0c6878";
  c.body.link_hover = "#d50808";
  c.top_bar.background = "#636363";
  c.top_bar.text = "#ffffff";
  c.top_bar.link = "#ffffff";
  c.header.background = "#0c6878";
  c.header.text = "#ffffff";
  c.header.site_title = "#ffffff";
  c.header.tagline = "#e1e1e1";
  c.primary_nav.nav_bg = "#0c6878";
  c.primary_nav.nav_text = "#ffffff";
  c.primary_nav.nav_text_hover = "#ffffff";
  c.primary_nav.nav_text_current = "#ffffff";
  c.primary_nav.sub_bg = "#0c6878";
  c.primary_nav.sub_text = "#ffffff";
  c.menu_strip.background = "#e1e1e1";
  c.menu_strip.text = "#1d1d1d";
  c.menu_strip.text_hover = "#d50808";
  c.off_canvas.background = "#0c6878";
  c.off_canvas.text = "#f7ffff";
  c.off_canvas.background_hover = "#0f7485";
  c.off_canvas.sub_bg = "#095666";
  c.buttons.background = "#0c6878";
  c.buttons.background_hover = "#095666";
  c.buttons.text = "#ffffff";
  c.buttons.text_hover = "#ffffff";
  c.content.background = "#ffffff";
  c.content.text = "#373737";
  c.content.link = "#1e73be";
  c.content.link_hover = "#d50808";
  c.content.title = "#111827";
  c.content.archive_title = "#111827";
  c.content.archive_title_hover = "#0c6878";
  c.content.meta_text = "#595959";
  c.content.meta_link = "#222222";
  c.content.meta_link_hover = "#0c6878";
  c.forms.field_bg = "#ffffff";
  c.forms.field_text = "#111827";
  c.forms.field_border = "#dcdfe4";
  c.forms.field_border_focus = "#0c6878";
  c.sidebar.background = "#ffffff";
  c.sidebar.text = "#373737";
  c.sidebar.link = "#111827";
  c.sidebar.link_hover = "#0c6878";
  c.sidebar.title = "#ffffff";
  c.sidebar.title_bg = "#0c6878";
  c.footer_widgets.background = "#0c6878";
  c.footer_widgets.text = "#ffffff";
  c.footer_widgets.link = "#ffffff";
  c.footer_widgets.link_hover = "#ffb700";
  c.footer_widgets.title = "#ffffff";
  c.footer_widgets.accent = "#ffb700";
  c.footer_bar.background = "#0c6878";
  c.footer_bar.text = "#ffffff";
  c.footer_bar.link = "#ffffff";
  c.footer_bar.link_hover = "#ffb700";
  c.search_modal.field_bg = "#ffffff";
  c.search_modal.field_text = "#111827";
  c.search_modal.overlay_bg = "rgba(0,0,0,0.6)";
  return c;
}

const R = (d: string, t = "", m = ""): Responsive<string> => ({ d, t, m });

export function newTypoRule(target: TypoTarget = "body"): TypoRule {
  return {
    id: Math.random().toString(36).slice(2, 9),
    target,
    selector: "",
    family: "",
    weight: "",
    transform: "",
    style: "",
    decoration: "",
    size: R(""),
    sizeUnit: "px",
    lineHeight: R(""),
    letterSpacing: R(""),
    marginBottom: R(""),
  };
}

export const DEFAULT_POST_TEMPLATE: PostTemplate = {
  design: "classic",
  breadcrumb: true,
  category_badge: true,
  meta_row: true,
  show_updated_date: true,
  pill_join: true,
  pill_join_label: "Join Us",
  pill_join_url: "",
  pill_follow: true,
  pill_follow_label: "Follow Us",
  pill_follow_url: "https://news.google.com/home",
  pill_preferred_source: true,
  card_gn_box: true,
  featured_image: true,
  featured_caption: true,
  summary: true,
  summary_title: "Summary",
  key_points: true,
  key_points_title: "Key Points",
  key_points_style: "check",
  toc: true,
  toc_title: "Table of Contents",
  toc_collapsed: false,
  tags: true,
  author_box: true,
  join_boxes: true,
  join_whatsapp_url: "",
  join_telegram_url: "",
  related: true,
  related_title: "और पढ़ें",
  related_count: 6,
  faq: true,
  share_buttons: false,
  comments: true,
  sidebar: true,
  sidebar_title: "ट्रेंडिंग ख़बरें",
  sidebar_count: 8,
  sidebar_source: "trending",
  sidebar_sticky: true,
  reading_progress: true,
  reading_progress_label: "In this article",
  reading_progress_desktop: false,
  also_read: true,
  also_read_label: "Also Read",
  also_read_style: "card",
  also_read_source: "category",
  also_read_after: "3",
  also_read_count: 1,
  font_title: 30,
  font_p: 17,
};

export const DEFAULT_THEME: ThemeSettings = {
  identity: { hide_title: true, hide_tagline: true, retina_logo: "", logo_width: 146, site_icon: "" },
  global_colors: DEFAULT_GLOBAL_COLORS,
  colors: defaultColors(),
  fonts: [{ family: "Noto Sans Devanagari", google: true, variants: ["400", "500", "600", "700"], fallback: "sans-serif" }],
  font_display: "swap",
  typography: [
    { ...newTypoRule("body"), id: "body", family: "Noto Sans Devanagari", weight: "500", size: R("17"), lineHeight: R("1.5"), marginBottom: R("1.5") },
  ],
  header: {
    sticky: true,
    logo_height: 50,
    menu: [
      { label: "Home", url: "/" },
      { label: "Categories", url: "/categories" },
      { label: "About Us", url: "/about-us" },
      { label: "Contact Us", url: "/contact-us" },
    ],
    show_search: true,
    search_style: "inline",
    search_placeholder: "Type keywords....",
    voice_search: true,
    dark_mode: true,
    bell: true,
    top_bar: false,
    top_bar_html: "",
    strip: true,
    strip_items: [],
    container: 1200,
  },
  footer: {
    logo: "",
    description: "",
    columns: [
      { title: "Categories", links: [], auto: "categories" },
      {
        title: "Quick Links",
        links: [
          { label: "About Us", url: "/about-us" },
          { label: "Contact Us", url: "/contact-us" },
          { label: "Privacy Policy", url: "/privacy-policy" },
        ],
      },
    ],
    follow_title: "Follow Us",
    cta: true,
    cta_title: "Follow Us On Social Media",
    cta_subtitle: "Get Latest Update On Social Media",
    cta_button_label: "",
    cta_button_url: "",
    cta_button_color: "#25bd41",
    socials: [
      { network: "facebook", url: "" },
      { network: "x", url: "" },
      { network: "instagram", url: "" },
      { network: "youtube", url: "" },
      { network: "threads", url: "" },
      { network: "rss", url: "/feed" },
    ],
    copyright: "© [year] [site_title]. All rights reserved.",
    style: "classic",
  },
  post: DEFAULT_POST_TEMPLATE,
  archive: { columns: 2, per_page: 10, show_author: true, show_date: true, show_excerpt: false, sidebar: true, home_heading: "" },
};

/** Deep-merges a saved (possibly partial / older) value over the defaults. */
export function mergeTheme(saved: unknown): ThemeSettings {
  const s = (saved && typeof saved === "object" ? saved : {}) as Partial<ThemeSettings>;
  const colors = defaultColors();
  if (s.colors && typeof s.colors === "object") {
    for (const g of Object.keys(colors) as ColorGroupKey[]) {
      const sg = (s.colors as Record<string, Record<string, string>>)[g];
      if (sg && typeof sg === "object") Object.assign(colors[g], sg);
    }
  }
  return {
    identity: { ...DEFAULT_THEME.identity, ...(s.identity ?? {}) },
    global_colors: Array.isArray(s.global_colors) && s.global_colors.length ? s.global_colors : DEFAULT_GLOBAL_COLORS,
    colors,
    fonts: Array.isArray(s.fonts) ? s.fonts : DEFAULT_THEME.fonts,
    font_display: s.font_display ?? DEFAULT_THEME.font_display,
    typography: Array.isArray(s.typography) ? s.typography.map((r) => ({ ...newTypoRule(r.target), ...r })) : DEFAULT_THEME.typography,
    header: { ...DEFAULT_THEME.header, ...(s.header ?? {}) },
    footer: { ...DEFAULT_THEME.footer, ...(s.footer ?? {}) },
    post: { ...DEFAULT_POST_TEMPLATE, ...(s.post ?? {}) },
    archive: { ...DEFAULT_THEME.archive, ...(s.archive ?? {}) },
  };
}
