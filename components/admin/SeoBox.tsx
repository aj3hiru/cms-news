"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MediaLibraryModal } from "./MediaLibraryModal";
import { focusKeywordUsage } from "@/lib/seo/editorActions";

export interface SeoDefaults {
  siteName: string;
  siteUrl: string;
  separator: string;
  titleFormat: string;
  descFormat: string;
  defaultSchema: string;
  schemaTypes: Record<string, string>;
  /** false when the Role Manager keeps this user's role out of the SEO box */
  canEdit: boolean;
  /** Link Counter module: internal / external link checks */
  linkCounter: boolean;
}

export interface PostSeoValues {
  title: string;
  focusKeyword: string;
  schemaType: string;
  canonical: string;
  noindex: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  nofollow: boolean;
  noarchive: boolean;
  noimageindex: boolean;
  nosnippet: boolean;
  pillar: boolean;
}

const EMPTY: PostSeoValues = { title: "", focusKeyword: "", schemaType: "", canonical: "", noindex: false, ogTitle: "", ogDescription: "", ogImage: "", nofollow: false, noarchive: false, noimageindex: false, nosnippet: false, pillar: false };

const POWER_WORDS = ["amazing", "best", "complete", "easy", "essential", "exclusive", "free", "guide", "latest", "new", "official", "proven", "quick", "simple", "secret", "top", "ultimate", "urgent", "important", "big", "huge", "alert", "breaking", "last date", "apply now", "released", "out", "declared", "big news", "good news"];

const strip = (h: string) =>
  h
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mediaSrc = (p: string) => {
  if (!p) return "";
  if (/^https?:\/\//.test(p)) return p;
  const r = p.replace(/^\/+/, "");
  return r.startsWith("uploads/") ? `/upload/media/${r.slice(8)}` : `/${r}`;
};

function Meter({ value, min, max }: { value: number; min: number; max: number }) {
  const cls = value === 0 ? "" : value < min ? "warn" : value > max ? "bad" : "good";
  return (
    <div className={`rmx-meter ${cls}`}>
      <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

type Check = [boolean, string, string];

/** Post editor SEO panel, laid out like Rank Math's: General (preview, focus keywords, tests), Advanced, Schema, Social. */
export function SeoBox({
  defaults,
  postId,
  title,
  slug,
  onSlug,
  content,
  summary,
  categoryName,
  featuredImage,
  metaDescription,
  onMetaDescription,
  initial,
}: {
  defaults: SeoDefaults;
  postId: number;
  title: string;
  slug: string;
  onSlug: (s: string) => void;
  content: string;
  summary: string;
  categoryName: string;
  featuredImage: string;
  metaDescription: string;
  onMetaDescription: (v: string) => void;
  initial?: PostSeoValues;
}) {
  const [v, setV] = useState<PostSeoValues>({ ...EMPTY, ...initial });
  const set = <K extends keyof PostSeoValues>(k: K, val: PostSeoValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const [tab, setTab] = useState<"general" | "advanced" | "schema" | "social">("general");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [social, setSocial] = useState<"fb" | "tw">("fb");
  const [kwInput, setKwInput] = useState("");
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [ogPick, setOgPick] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "Basic SEO": true });
  const [usage, setUsage] = useState<Record<string, number | null>>({});
  // the description fills itself from the summary / first lines until it is edited by hand
  const [descTouched, setDescTouched] = useState(Boolean(metaDescription.trim()));
  const host = defaults.siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const keywords = v.focusKeyword.split(",").map((k) => k.trim()).filter(Boolean);
  const kw = (keywords[0] ?? "").toLowerCase();

  const text = useMemo(() => strip(content), [content]);
  const autoDesc = useMemo(() => {
    const t = strip(summary) || text;
    if (t.length <= 158) return t;
    const cut = t.slice(0, 158);
    const sp = cut.lastIndexOf(" ");
    return (sp > 100 ? cut.slice(0, sp) : cut).replace(/[ ,.;:-]+$/, "");
  }, [summary, text]);
  useEffect(() => {
    if (!descTouched && autoDesc !== metaDescription) onMetaDescription(autoDesc);
  }, [autoDesc, descTouched, metaDescription, onMetaDescription]);

  const fill = (tpl: string) =>
    tpl
      .replace(/%title%/g, title || "Post title")
      .replace(/%sitename%/g, defaults.siteName)
      .replace(/%sep%|%separator%/g, defaults.separator)
      .replace(/%category%/g, categoryName)
      .replace(/%focuskw%/g, keywords[0] ?? "")
      .replace(/%excerpt%/g, autoDesc)
      .replace(/%currentyear%/g, String(new Date().getFullYear()))
      .replace(/%[a-z_]+%/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const shownTitle = fill(v.title || defaults.titleFormat || "%title% %sep% %sitename%");
  const desc = metaDescription.trim() || fill(defaults.descFormat || "%excerpt%");

  // keyword already used in other posts?
  const usageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!kw || kw in usage) return;
    if (usageTimer.current) clearTimeout(usageTimer.current);
    usageTimer.current = setTimeout(() => {
      setUsage((u) => ({ ...u, [kw]: null }));
      focusKeywordUsage(kw, postId)
        .then((n) => setUsage((u) => ({ ...u, [kw]: n })))
        .catch(() => setUsage((u) => ({ ...u, [kw]: 0 })));
    }, 500);
  }, [kw, postId, usage]);

  const groups = useMemo(() => {
    if (!kw) return [];
    const low = text.toLowerCase();
    const words = text ? text.split(" ").length : 0;
    const hrefs = [...content.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>/gi)].map((m) => ({ href: m[1], tag: m[0] }));
    const ext = hrefs.filter((h) => /^https?:\/\//.test(h.href) && !h.href.includes(host));
    const int = hrefs.filter((h) => (h.href.startsWith("/") && !h.href.startsWith("//")) || h.href.includes(host));
    const paras = [...content.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)].map((m) => strip(m[0]).split(" ").filter(Boolean).length);
    const heads = (content.match(/<h[2-4][\s>]/gi) || []).length;
    const imgs = [...content.matchAll(/<img\s[^>]*>/gi)].map((m) => m[0]);
    const hasMedia = imgs.length > 0 || /<iframe|<video/i.test(content) || Boolean(featuredImage);
    const kwSlug = kw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const count = low.split(kw).length - 1;
    const dens = words ? (count * kw.split(" ").length * 100) / words : 0;
    const first10 = low.slice(0, Math.max(150, Math.round(low.length * 0.1)));
    const titleLow = shownTitle.toLowerCase();
    const tPos = titleLow.indexOf(kw);
    const used = usage[kw];
    const additional: Check[] = [
      [new RegExp(`<h[2-6][^>]*>[^<]*${escRe(kw)}`, "i").test(content), "Focus Keyword found in the subheading(s).", "Use Focus Keyword in subheading(s) like H2, H3, H4, etc."],
      [imgs.some((t) => new RegExp(`alt="[^"]*${escRe(kw)}`, "i").test(t)), "Focus Keyword found in image alt attribute(s).", "Add an image with your Focus Keyword as alt text."],
      [dens >= 0.5 && dens <= 2.5, `Keyword Density is ${dens.toFixed(2)}%, the Focus Keyword appears ${count} times.`, `Keyword Density is ${dens.toFixed(2)}%. Aim for around 1% Keyword Density.`],
      [slug.length > 0 && slug.length <= 75, `URL is ${slug.length} characters long. Kudos!`, `URL is ${slug.length} characters long. Consider shortening it.`],
    ];
    if (defaults.linkCounter) {
      additional.push(
        [ext.length > 0, "You are linking to external resources.", "Link out to external resources."],
        [ext.some((h) => !/rel="[^"]*nofollow/i.test(h.tag)), "At least one external link with DoFollow found in your content.", "Add DoFollow links pointing to external resources."],
        [int.length > 0, "You are linking to other resources on your website which is great.", "Add internal links in your content."]
      );
    }
    additional.push([!used, used === null || used === undefined ? "Checking if this Focus Keyword was used before…" : "You haven’t used this Focus Keyword before.", `You have already used this Focus Keyword in ${used} other post(s).`]);
    return [
      {
        name: "Basic SEO",
        items: [
          [titleLow.includes(kw), "Hurray! You’re using Focus Keyword in the SEO Title.", "Add Focus Keyword to the SEO title."],
          [desc.toLowerCase().includes(kw), "Focus Keyword used inside SEO Meta Description.", "Add Focus Keyword to your SEO Meta Description."],
          [Boolean(kwSlug) && slug.toLowerCase().includes(kwSlug), "Focus Keyword used in the URL.", "Use Focus Keyword in the URL."],
          [first10.includes(kw), "Focus Keyword appears in the first 10% of the content.", "Use Focus Keyword at the beginning of your content."],
          [low.includes(kw), "Focus Keyword found in the content.", "Focus Keyword doesn’t appear in the content."],
          [words >= 600, `Content is ${words} words long. Good job!`, `Content is ${words} words long. Consider using at least 600 words.`],
        ] as Check[],
      },
      { name: "Additional", items: additional },
      {
        name: "Title Readability",
        items: [
          [tPos >= 0 && tPos <= titleLow.length / 2, "Focus Keyword used at the beginning of SEO title.", "Use the Focus Keyword near the beginning of SEO title."],
          [POWER_WORDS.some((w) => titleLow.includes(w)), "Your title contains a power word.", "Your title doesn’t contain a power word. Add at least one."],
          [/\d/.test(shownTitle), "You are using a number in your SEO title.", "Add a number to your title to improve CTR."],
          [shownTitle.length >= 30 && shownTitle.length <= 65, `SEO title is ${shownTitle.length} characters long.`, `SEO title is ${shownTitle.length} characters long — aim for 30–65.`],
        ] as Check[],
      },
      {
        name: "Content Readability",
        items: [
          [heads >= 2, "You seem to be using a Table of Contents (from your headings).", "Use subheadings (H2/H3) — the post then gets a Table of Contents."],
          [paras.length === 0 || Math.max(...paras) <= 120, "You are using short paragraphs.", "Add short and concise paragraphs for better readability and UX."],
          [hasMedia, "Your content contains images and/or video(s).", "Add a few images and/or videos to make your content appealing."],
        ] as Check[],
      },
    ];
  }, [kw, text, content, host, featuredImage, slug, shownTitle, desc, usage, defaults.linkCounter]);

  const all = groups.flatMap((g) => g.items);
  const score = kw && all.length ? Math.round((all.filter((i) => i[0]).length * 100) / all.length) : 0;
  const scoreCls = score >= 80 ? "good" : score >= 50 ? "warn" : "bad";

  function addKeyword(raw: string) {
    const add = raw.split(",").map((k) => k.trim()).filter(Boolean);
    if (!add.length) return setKwInput("");
    const next = [...keywords];
    for (const k of add) if (!next.some((x) => x.toLowerCase() === k.toLowerCase()) && next.length < 5) next.push(k);
    set("focusKeyword", next.join(", "));
    setKwInput("");
  }
  const removeKeyword = (i: number) => set("focusKeyword", keywords.filter((_, j) => j !== i).join(", "));

  const ogImg = v.ogImage ? mediaSrc(v.ogImage) : featuredImage;
  const schemaLabel = defaults.schemaTypes[v.schemaType || defaults.defaultSchema] ?? (v.schemaType || defaults.defaultSchema);

  // Every value is always posted, also when this user may not edit the SEO box (saving would otherwise erase it).
  const hidden = (
    <>
      <input type="hidden" name="seoTitle" value={v.title} />
      <input type="hidden" name="focusKeyword" value={v.focusKeyword} />
      <input type="hidden" name="schemaType" value={v.schemaType} />
      <input type="hidden" name="canonical" value={v.canonical} />
      {v.noindex && <input type="hidden" name="noindex" value="on" />}
      {v.nofollow && <input type="hidden" name="robotsNofollow" value="on" />}
      {v.noarchive && <input type="hidden" name="robotsNoarchive" value="on" />}
      {v.noimageindex && <input type="hidden" name="robotsNoimageindex" value="on" />}
      {v.nosnippet && <input type="hidden" name="robotsNosnippet" value="on" />}
      {v.pillar && <input type="hidden" name="pillar" value="on" />}
      <input type="hidden" name="ogTitle" value={v.ogTitle} />
      <input type="hidden" name="ogDescription" value={v.ogDescription} />
      <input type="hidden" name="ogImage" value={v.ogImage} />
      <input type="hidden" name="metaDescription" id="metaDescription" value={metaDescription} />
    </>
  );

  if (!defaults.canEdit) return hidden;

  return (
    <div className="meta-panel seo-box rmx">
      {hidden}
      <div className="meta-panel-header">
        <span>
          <i className="fas fa-chart-simple" /> SEO
        </span>
        <span className={`rmx-score ${scoreCls}`} title="SEO score">
          {score} / 100
        </span>
      </div>
      <div className="meta-panel-body">
        <div className="rmx-tabs" role="tablist">
          {(
            [
              ["general", "General", "fa-gear"],
              ["advanced", "Advanced", "fa-toolbox"],
              ["schema", "Schema", "fa-diagram-project"],
              ["social", "Social", "fa-share-nodes"],
            ] as const
          ).map(([id, label, icon]) => (
            <button type="button" key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}>
              <i className={`fas ${icon}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div className="rmx-pane">
            <div className="rmx-h">
              Preview
              <span className="rmx-dev">
                <button type="button" className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")} title="Desktop preview">
                  <i className="fas fa-desktop" />
                </button>
                <button type="button" className={device === "mobile" ? "on" : ""} onClick={() => setDevice("mobile")} title="Mobile preview">
                  <i className="fas fa-mobile-screen" />
                </button>
              </span>
            </div>
            <div className={`rmx-serp ${device}`}>
              <div className="rmx-serp-site">
                <span className="rmx-fav">{defaults.siteName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <div className="rmx-serp-name">{defaults.siteName}</div>
                  <div className="rmx-serp-url">
                    {host} › {slug || "post-url"}
                  </div>
                </div>
              </div>
              <div className="rmx-serp-title">{shownTitle}</div>
              <div className="rmx-serp-desc">{desc || "Add content or a summary — the description is filled in from it."}</div>
            </div>
            <button type="button" className="rmx-edit" onClick={() => setSnippetOpen(true)}>
              <i className="fas fa-pen" /> Edit Snippet
            </button>

            <div className="rmx-h" style={{ marginTop: 14 }}>
              Focus Keyword <i className="fas fa-circle-question" title="The main search phrase you want this post to rank for. Add more after it — the first one is checked." />
            </div>
            <div className="rmx-kw" onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}>
              {keywords.map((k, i) => (
                <span key={k} className={`rmx-chip${i === 0 ? " primary" : ""}`}>
                  {k}
                  <button type="button" onClick={() => removeKeyword(i)} aria-label={`Remove ${k}`}>
                    ×
                  </button>
                </span>
              ))}
              <input
                value={kwInput}
                aria-label="Focus keyword"
                placeholder={keywords.length ? "" : "Example: NEET UG result 2026"}
                onChange={(e) => (e.target.value.includes(",") ? addKeyword(e.target.value) : setKwInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword(kwInput);
                  } else if (e.key === "Backspace" && !kwInput && keywords.length) removeKeyword(keywords.length - 1);
                }}
                onBlur={() => kwInput.trim() && addKeyword(kwInput)}
              />
            </div>
            <label className="rmx-check">
              <input type="checkbox" checked={v.pillar} onChange={(e) => set("pillar", e.target.checked)} /> This post is Pillar Content{" "}
              <i className="fas fa-circle-question" title="Your most important, complete guides on a topic." />
            </label>

            {!kw ? (
              <div className="rmx-warn">
                <i className="fas fa-circle-info" /> Set a Focus Keyword for this content to see the SEO checks and score.
              </div>
            ) : (
              groups.map((g) => {
                const bad = g.items.filter((i) => !i[0]).length;
                const open = openGroups[g.name] ?? false;
                return (
                  <div key={g.name} className={`rmx-group${open ? " open" : ""}`}>
                    <button type="button" className="rmx-group-h" onClick={() => setOpenGroups((o) => ({ ...o, [g.name]: !open }))}>
                      {g.name} <span className={`rmx-badge ${bad ? "bad" : "good"}`}>{bad ? (bad === 1 ? "1 Error" : `${bad} Errors`) : "✓ All Good"}</span>
                      <i className="fas fa-chevron-down" />
                    </button>
                    {open && (
                      <ul>
                        {g.items.map((i, n) => (
                          <li key={n} className={i[0] ? "ok" : "no"}>
                            <i className={`fas ${i[0] ? "fa-circle-check" : "fa-circle-xmark"}`} />
                            <span>{i[0] ? i[1] : i[2]}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "advanced" && (
          <div className="rmx-pane">
            <div className="rmx-h">Robots Meta</div>
            <div className="rmx-grid2">
              <label className="rmx-check">
                <input type="radio" checked={!v.noindex} onChange={() => set("noindex", false)} /> Index
              </label>
              <label className="rmx-check">
                <input type="radio" checked={v.noindex} onChange={() => set("noindex", true)} /> No Index
              </label>
              {(
                [
                  ["nofollow", "Nofollow"],
                  ["noarchive", "No Archive"],
                  ["noimageindex", "No Image Index"],
                  ["nosnippet", "No Snippet"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="rmx-check">
                  <input type="checkbox" checked={v[k]} onChange={(e) => set(k, e.target.checked)} /> {l}
                </label>
              ))}
            </div>
            <p className="rmx-hint">“No Index” keeps this post out of Google and the sitemap.</p>
            <label className="rmx-label">
              Canonical URL
              <input type="url" value={v.canonical} onChange={(e) => set("canonical", e.target.value)} placeholder={`${defaults.siteUrl}/${slug || "post-url"}`} />
            </label>
            <p className="rmx-hint">The canonical URL that this page should point to. Leave empty to default to the permalink.</p>
          </div>
        )}

        {tab === "schema" && (
          <div className="rmx-pane">
            <div className="rmx-h">Schema in Use</div>
            <div className="rmx-schema">
              <i className="fas fa-newspaper" />
              <div>
                <b>{schemaLabel}</b>
                <small>Shows as rich result data for Google</small>
              </div>
            </div>
            <div className="rmx-h" style={{ marginTop: 12 }}>
              Article Type
            </div>
            <label className="rmx-check">
              <input type="radio" checked={!v.schemaType} onChange={() => set("schemaType", "")} /> Default ({defaults.schemaTypes[defaults.defaultSchema] ?? defaults.defaultSchema})
            </label>
            {Object.entries(defaults.schemaTypes).map(([k, l]) => (
              <label key={k} className="rmx-check">
                <input type="radio" checked={v.schemaType === k} onChange={() => set("schemaType", k)} /> {l}
              </label>
            ))}
            <p className="rmx-hint">
              News updates usually use <b>News Article</b>; guides use <b>Blog Post</b>. FAQs added to the post become FAQ schema, the author becomes Person schema, and the featured image an ImageObject — automatically.
            </p>
          </div>
        )}

        {tab === "social" && (
          <div className="rmx-pane">
            <div className="rmx-subtabs">
              <button type="button" className={social === "fb" ? "on" : ""} onClick={() => setSocial("fb")}>
                <i className="fab fa-facebook" /> Facebook
              </button>
              <button type="button" className={social === "tw" ? "on" : ""} onClick={() => setSocial("tw")}>
                <i className="fab fa-x-twitter" /> Twitter
              </button>
            </div>
            <div className={`rmx-card${social === "tw" ? " tw" : ""}`}>
              <div className="rmx-card-img">
                {ogImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ogImg} alt="" />
                ) : (
                  <span>No image — add a featured image</span>
                )}
              </div>
              <div className="rmx-card-body">
                <small>{host.toUpperCase()}</small>
                <b>{v.ogTitle.trim() || shownTitle}</b>
                <span>{v.ogDescription.trim() || desc}</span>
              </div>
            </div>
            <div className="rmx-label">
              Image
              <span className="rmx-imgrow">
                <button type="button" className="rm-btn" onClick={() => setOgPick(true)}>
                  {v.ogImage ? "Change Image" : "Add or Upload File"}
                </button>
                {v.ogImage && (
                  <button type="button" className="rm-btn danger" onClick={() => set("ogImage", "")}>
                    Remove
                  </button>
                )}
              </span>
            </div>
            <p className="rmx-hint">Empty = the featured image. Use 1200 × 630 px.</p>
            <label className="rmx-label">
              Title
              <input type="text" maxLength={200} value={v.ogTitle} placeholder="Same as the SEO title" onChange={(e) => set("ogTitle", e.target.value)} />
            </label>
            <label className="rmx-label">
              Description
              <textarea rows={3} maxLength={300} value={v.ogDescription} placeholder="Same as the meta description" onChange={(e) => set("ogDescription", e.target.value)} />
            </label>
            <p className="rmx-hint">Used by Facebook, WhatsApp, X (Twitter), LinkedIn and Telegram link previews.</p>
            <MediaLibraryModal
              open={ogPick}
              onClose={() => setOgPick(false)}
              onSelect={(i) => {
                set("ogImage", i.path.replace(/^\/+/, ""));
                setOgPick(false);
              }}
            />
          </div>
        )}
      </div>

      {snippetOpen &&
        createPortal(
          <SnippetEditor
            initialTitle={v.title || defaults.titleFormat}
            initialSlug={slug}
            initialDesc={metaDescription || autoDesc}
            fill={fill}
            host={host}
            siteName={defaults.siteName}
            onClose={() => setSnippetOpen(false)}
            onApply={(t, s, d) => {
              set("title", t.trim() === defaults.titleFormat ? "" : t.trim());
              if (s && s !== slug) onSlug(s);
              const dd = d.trim();
              onMetaDescription(dd || autoDesc);
              setDescTouched(Boolean(dd) && dd !== autoDesc);
              setSnippetOpen(false);
            }}
          />,
          document.body
        )}
    </div>
  );
}

function SnippetEditor({
  initialTitle,
  initialSlug,
  initialDesc,
  fill,
  host,
  siteName,
  onClose,
  onApply,
}: {
  initialTitle: string;
  initialSlug: string;
  initialDesc: string;
  fill: (t: string) => string;
  host: string;
  siteName: string;
  onClose: () => void;
  onApply: (title: string, slug: string, desc: string) => void;
}) {
  const [t, setT] = useState(initialTitle);
  const [s, setS] = useState(initialSlug);
  const [d, setD] = useState(initialDesc);
  const shown = fill(t || "%title% %sep% %sitename%");
  const slugify = (x: string) =>
    x
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9ऀ-ॿ]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return (
    <div className="be-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="be-modal rmx-modal" role="dialog" aria-label="Preview Snippet Editor">
        <div className="be-modal-head">
          <h3>
            <i className="fas fa-pen" /> Preview Snippet Editor
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <i className="fas fa-xmark" />
          </button>
        </div>
        <div className="be-modal-body">
          <div className="rmx-serp desktop">
            <div className="rmx-serp-site">
              <span className="rmx-fav">{siteName.slice(0, 1).toUpperCase()}</span>
              <div>
                <div className="rmx-serp-name">{siteName}</div>
                <div className="rmx-serp-url">
                  {host} › {s || "post-url"}
                </div>
              </div>
            </div>
            <div className="rmx-serp-title">{shown}</div>
            <div className="rmx-serp-desc">{d}</div>
          </div>
          <label className="rmx-label">
            Title <span className="rmx-cnt">{shown.length} / 60</span>
            <input value={t} onChange={(e) => setT(e.target.value)} autoFocus />
          </label>
          <Meter value={shown.length} min={30} max={60} />
          <p className="rmx-hint">
            Variables: <code>%title%</code> <code>%sep%</code> <code>%sitename%</code> <code>%category%</code> <code>%focuskw%</code> <code>%currentyear%</code>
          </p>
          <label className="rmx-label">
            Permalink <span className="rmx-cnt">{s.length} / 75</span>
            <input value={s} onChange={(e) => setS(e.target.value)} onBlur={() => setS(slugify(s))} />
          </label>
          <Meter value={s.length} min={1} max={75} />
          <label className="rmx-label">
            Description <span className="rmx-cnt">{d.length} / 160</span>
            <textarea rows={4} value={d} onChange={(e) => setD(e.target.value)} />
          </label>
          <Meter value={d.length} min={120} max={160} />
          <p className="rmx-hint">This is what will appear as the description when this post shows up in the search results. It is filled from the summary / first lines automatically — edit it to make it better.</p>
          <div className="rmx-modal-foot">
            <button type="button" className="rm-btn" onClick={onClose}>
              Close
            </button>
            <button type="button" className="rm-btn primary" onClick={() => onApply(t, slugify(s), d)}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
