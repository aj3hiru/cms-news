"use client";

import { useMemo, useState } from "react";

export interface SeoDefaults {
  siteName: string;
  siteUrl: string;
  separator: string;
  titleFormat: string;
  defaultSchema: string;
  schemaTypes: Record<string, string>;
}

export interface PostSeoValues {
  title: string;
  focusKeyword: string;
  schemaType: string;
  canonical: string;
  noindex: boolean;
  ogTitle: string;
  ogDescription: string;
}

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function Meter({ value, min, max }: { value: number; min: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const cls = value === 0 ? "" : value < min ? "warn" : value > max ? "bad" : "good";
  return (
    <div className={`seo-meter ${cls}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Per-post SEO box: Google preview, focus keyword analysis, schema type and advanced options. */
export function SeoBox({
  defaults,
  title,
  slug,
  content,
  metaDescription,
  onMetaDescription,
  initial,
  hasFeaturedImage,
}: {
  defaults: SeoDefaults;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  onMetaDescription: (v: string) => void;
  initial?: PostSeoValues;
  hasFeaturedImage: boolean;
}) {
  const [tab, setTab] = useState<"general" | "schema" | "social" | "advanced">("general");
  const [seoTitle, setSeoTitle] = useState(initial?.title ?? "");
  const [keyword, setKeyword] = useState(initial?.focusKeyword ?? "");
  const [schemaType, setSchemaType] = useState(initial?.schemaType ?? "");
  const [canonical, setCanonical] = useState(initial?.canonical ?? "");
  const [noindex, setNoindex] = useState(initial?.noindex ?? false);
  const [ogTitle, setOgTitle] = useState(initial?.ogTitle ?? "");
  const [ogDescription, setOgDescription] = useState(initial?.ogDescription ?? "");

  const autoTitle = (defaults.titleFormat || "%title% %sep% %sitename%")
    .replace(/%title%/g, title || "Post title")
    .replace(/%sitename%/g, defaults.siteName)
    .replace(/%sep%/g, defaults.separator)
    .replace(/%page%/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const shownTitle = seoTitle || autoTitle;
  const text = useMemo(() => strip(content), [content]);
  const shownDesc = metaDescription || text.slice(0, 158);
  const host = defaults.siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  const checks = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const words = text ? text.split(" ").length : 0;
    const first = strip((/<p[\s>][\s\S]*?<\/p>/i.exec(content) ?? [""])[0]).toLowerCase();
    const list: { ok: boolean; label: string }[] = [];
    if (kw) {
      const kwSlug = kw.replace(/\s+/g, "-");
      list.push({ ok: shownTitle.toLowerCase().includes(kw), label: "Focus keyword in the SEO title" });
      list.push({ ok: shownDesc.toLowerCase().includes(kw), label: "Focus keyword in the meta description" });
      list.push({ ok: slug.toLowerCase().includes(kwSlug) || slug.toLowerCase().includes(kw.replace(/\s+/g, "")), label: "Focus keyword in the URL" });
      list.push({ ok: first.includes(kw), label: "Focus keyword in the first paragraph" });
      list.push({ ok: /<h[2-4][^>]*>[^<]*/i.test(content) && new RegExp(`<h[2-4][^>]*>[^<]*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(content), label: "Focus keyword in a subheading (H2–H4)" });
      const count = text.toLowerCase().split(kw).length - 1;
      const density = words ? (count * kw.split(" ").length * 100) / words : 0;
      list.push({ ok: density >= 0.5 && density <= 2.5, label: `Keyword density ${density.toFixed(1)}% (aim for 0.5–2.5%)` });
    }
    list.push({ ok: shownTitle.length >= 30 && shownTitle.length <= 60, label: `SEO title length ${shownTitle.length} (30–60 characters)` });
    list.push({ ok: metaDescription.length >= 120 && metaDescription.length <= 160, label: `Meta description length ${metaDescription.length} (120–160 characters)` });
    list.push({ ok: words >= 300, label: `Content length ${words} words (300+ recommended)` });
    list.push({ ok: /<h2[\s>]/i.test(content), label: "Uses H2 subheadings" });
    list.push({ ok: hasFeaturedImage || /<img\s/i.test(content), label: "Has a featured image or an image in the content" });
    list.push({ ok: !/<img(?![^>]*\balt="[^"]+")[^>]*>/i.test(content), label: "All content images have alt text" });
    const hrefs = [...content.matchAll(/<a\s[^>]*href="([^"]+)"/gi)].map((m) => m[1]);
    list.push({ ok: hrefs.some((h) => (h.startsWith("/") && !h.startsWith("//")) || h.includes(host)), label: "Has an internal link" });
    list.push({ ok: hrefs.some((h) => /^https?:\/\//.test(h) && !h.includes(host)), label: "Has an outbound link" });
    list.push({ ok: slug.length > 0 && slug.length <= 75, label: "URL is short (75 characters or less)" });
    return list;
  }, [keyword, shownTitle, shownDesc, slug, content, text, metaDescription, hasFeaturedImage, host]);

  const score = checks.length ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 100) : 0;
  const scoreCls = score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
  const defaultLabel = defaults.schemaTypes[defaults.defaultSchema] ?? defaults.defaultSchema;

  return (
    <div className="meta-panel seo-box">
      <div className="meta-panel-header">
        <span>
          <i className="fas fa-magnifying-glass-chart" /> SEO
        </span>
        <span className={`seo-score ${scoreCls}`}>{score} / 100</span>
      </div>
      <div className="meta-panel-body">
        <div className="seo-tabs">
          {(["general", "schema", "social", "advanced"] as const).map((t) => (
            <button type="button" key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t === "general" ? "General" : t === "schema" ? "Schema" : t === "social" ? "Social" : "Advanced"}
            </button>
          ))}
        </div>

        <div style={{ display: tab === "general" ? "block" : "none" }}>
          <div className="seo-preview">
            <div className="seo-preview-site">
              <span className="seo-preview-fav">{defaults.siteName.slice(0, 1).toUpperCase()}</span>
              <div>
                <div className="seo-preview-name">{defaults.siteName}</div>
                <div className="seo-preview-url">
                  {host} › {slug || "post-url"}
                </div>
              </div>
            </div>
            <div className="seo-preview-title">{shownTitle.length > 62 ? shownTitle.slice(0, 60) + " …" : shownTitle}</div>
            <div className="seo-preview-desc">{shownDesc.length > 160 ? shownDesc.slice(0, 157) + " …" : shownDesc || "Add a meta description to control what Google shows here."}</div>
          </div>

          <label className="seo-label">
            Focus keyword
            <input type="text" name="focusKeyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. NEET UG result 2026" />
          </label>

          <label className="seo-label">
            SEO title <span className="seo-hint">(empty = {defaults.titleFormat.replace(/%/g, "")})</span>
            <input type="text" name="seoTitle" value={seoTitle} maxLength={200} onChange={(e) => setSeoTitle(e.target.value)} placeholder={autoTitle} />
            <Meter value={shownTitle.length} min={30} max={60} />
          </label>

          <label className="seo-label">
            Meta description <span className="req-star">*</span>
            <textarea id="metaDescription" name="metaDescription" rows={3} value={metaDescription} onChange={(e) => onMetaDescription(e.target.value)} placeholder="What the article is about, in 120–160 characters." />
            <Meter value={metaDescription.length} min={120} max={160} />
          </label>

          <ul className="seo-checks">
            {checks.map((c, i) => (
              <li key={i} className={c.ok ? "ok" : "no"}>
                <i className={`fas ${c.ok ? "fa-circle-check" : "fa-circle-xmark"}`} /> {c.label}
              </li>
            ))}
            {!keyword.trim() && (
              <li className="info">
                <i className="fas fa-circle-info" /> Add a focus keyword to get keyword checks.
              </li>
            )}
          </ul>
        </div>

        <div style={{ display: tab === "schema" ? "block" : "none" }}>
          <label className="seo-label">
            Schema type
            <select name="schemaType" value={schemaType} onChange={(e) => setSchemaType(e.target.value)}>
              <option value="">Default ({defaultLabel})</option>
              {Object.entries(defaults.schemaTypes).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <p className="field-hint">
            Tells Google what kind of content this is. News sites usually use <b>News Article</b>; blogs use <b>Blog Post</b>. The default is set in SEO → Settings. FAQs
            added to this post are added as FAQ schema automatically.
          </p>
        </div>

        <div style={{ display: tab === "social" ? "block" : "none" }}>
          <label className="seo-label">
            Facebook / WhatsApp / X title
            <input type="text" name="ogTitle" value={ogTitle} maxLength={200} onChange={(e) => setOgTitle(e.target.value)} placeholder={title || "Post title"} />
          </label>
          <label className="seo-label">
            Social description
            <textarea name="ogDescription" rows={2} maxLength={300} value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} placeholder={shownDesc || "Meta description"} />
          </label>
          <p className="field-hint">The featured image is used as the share image.</p>
        </div>

        <div style={{ display: tab === "advanced" ? "block" : "none" }}>
          <label className="seo-check">
            <input type="checkbox" name="noindex" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} /> No Index — hide this post from Google
          </label>
          <label className="seo-label">
            Canonical URL
            <input type="url" name="canonical" value={canonical} onChange={(e) => setCanonical(e.target.value)} placeholder={`${defaults.siteUrl}/${slug || "post-url"}`} />
          </label>
          <p className="field-hint">Leave empty unless this article was first published at another address.</p>
        </div>
      </div>
    </div>
  );
}
