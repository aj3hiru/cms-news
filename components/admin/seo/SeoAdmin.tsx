"use client";

import { useState } from "react";
import { saveSeoSettings } from "@/lib/seo/actions";
import { SCHEMA_TYPES, type SeoSettings, type SchemaType } from "@/lib/seo/settings";
import { MediaLibraryModal } from "../MediaLibraryModal";

type Tab = "titles" | "schema" | "social" | "indexing" | "webmaster" | "redirects";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "titles", label: "Titles & Meta", icon: "fa-heading" },
  { id: "schema", label: "Schema", icon: "fa-sitemap" },
  { id: "social", label: "Social", icon: "fa-share-nodes" },
  { id: "indexing", label: "Indexing & Sitemaps", icon: "fa-magnifying-glass" },
  { id: "webmaster", label: "Webmaster Tools", icon: "fa-shield-halved" },
  { id: "redirects", label: "404 Redirect", icon: "fa-route" },
];
const SEPARATORS = ["–", "-", "|", "·", "•", "»", "/", "~"];

function mediaSrc(p: string) {
  if (!p) return "";
  if (/^https?:\/\//.test(p)) return p;
  const r = p.replace(/^\/+/, "");
  return r.startsWith("uploads/") ? `/upload/media/${r.slice(8)}` : `/${r}`;
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="seo-row">
      <div className="seo-row-label">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </div>
      <div className="seo-row-field">{children}</div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="seo-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" />
      {label && <em>{label}</em>}
    </label>
  );
}

export function LogoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="seo-logo">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaSrc(value)} alt="" />
      ) : (
        <span className="seo-logo-empty">No image</span>
      )}
      <button type="button" className="seo-btn-light" onClick={() => setOpen(true)}>
        {value ? "Change" : "Choose image"}
      </button>
      {value && (
        <button type="button" className="seo-btn-link" onClick={() => onChange("")}>
          Remove
        </button>
      )}
      <MediaLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(i) => {
          onChange(i.path.replace(/^\/+/, ""));
          setOpen(false);
        }}
      />
    </div>
  );
}

function preview(format: string, sep: string, site: string) {
  return format.replace(/%title%/g, "Your Post Title").replace(/%term%/g, "Category Name").replace(/%sitename%/g, site).replace(/%sep%/g, sep).replace(/%page%/g, "").replace(/\s+/g, " ").trim();
}

/** SEO → Settings (all tabs). */
export function SeoAdmin({ initial, siteName, siteUrl }: { initial: SeoSettings; siteName: string; siteUrl: string }) {
  const [s, setS] = useState(initial);
  const [tab, setTab] = useState<Tab>("titles");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof SeoSettings>(k: K, v: SeoSettings[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setMsg(null);
  };

  async function save() {
    setSaving(true);
    const r = await saveSeoSettings(s);
    setSaving(false);
    setMsg(r.ok ? { ok: true, text: "Settings saved." } : { ok: false, text: r.error ?? "Could not save." });
  }

  return (
    <div className="seo-admin">
      <div className="seo-hero">
        <div>
          <h2>
            <i className="fas fa-magnifying-glass-chart" /> SEO
          </h2>
          <p>Titles, schema, social cards, indexing and search-engine verification for the whole site.</p>
        </div>
        <a className="seo-btn" href="/admin/seo/wizard">
          <i className="fas fa-wand-magic-sparkles" /> {s.configured ? "Run setup wizard again" : "Start setup wizard"}
        </a>
      </div>
      {!s.configured && (
        <div className="seo-notice">
          <i className="fas fa-circle-info" /> The setup wizard has not been completed. It takes about a minute and sets the most important options.
        </div>
      )}

      <div className="seo-layout">
        <nav className="seo-tabs-v">
          {TABS.map((t) => (
            <button type="button" key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              <i className={`fas ${t.icon}`} /> {t.label}
            </button>
          ))}
        </nav>

        <div className="seo-card">
          {tab === "titles" && (
            <>
              <Row label="Title separator" hint="Placed between the title and the site name.">
                <div className="seo-seps">
                  {SEPARATORS.map((x) => (
                    <button type="button" key={x} className={s.separator === x ? "active" : ""} onClick={() => set("separator", x)}>
                      {x}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Post title format" hint="Variables: %title% %sitename% %sep%">
                <input value={s.post_title_format} onChange={(e) => set("post_title_format", e.target.value)} />
                <small className="seo-prev">{preview(s.post_title_format, s.separator, siteName)}</small>
              </Row>
              <Row label="Page title format">
                <input value={s.page_title_format} onChange={(e) => set("page_title_format", e.target.value)} />
                <small className="seo-prev">{preview(s.page_title_format, s.separator, siteName)}</small>
              </Row>
              <Row label="Category / tag / author title" hint="Variables: %term% %sitename% %sep%">
                <input value={s.archive_title_format} onChange={(e) => set("archive_title_format", e.target.value)} />
                <small className="seo-prev">{preview(s.archive_title_format, s.separator, siteName)}</small>
              </Row>
              <Row label="Homepage title" hint="Empty = site title and tagline. Shortcodes allowed.">
                <input value={s.home_title} placeholder={siteName} onChange={(e) => set("home_title", e.target.value)} />
              </Row>
              <Row label="Homepage meta description">
                <textarea rows={3} value={s.home_description} onChange={(e) => set("home_description", e.target.value)} />
                <small className="seo-prev">{s.home_description.length} / 160 characters</small>
              </Row>
            </>
          )}

          {tab === "schema" && (
            <>
              <Row label="Default article schema" hint="Used by every post unless the post's SEO box picks another type.">
                <select value={s.default_schema} onChange={(e) => set("default_schema", e.target.value as SchemaType)}>
                  {Object.entries(SCHEMA_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="This website represents">
                <div className="seo-seg">
                  {(["organization", "person"] as const).map((v) => (
                    <button type="button" key={v} className={s.represents === v ? "active" : ""} onClick={() => set("represents", v)}>
                      {v === "organization" ? "An organization / publication" : "A person"}
                    </button>
                  ))}
                </div>
              </Row>
              {s.represents === "organization" ? (
                <>
                  <Row label="Organization type">
                    <select value={s.org_type} onChange={(e) => set("org_type", e.target.value as SeoSettings["org_type"])}>
                      <option value="NewsMediaOrganization">News Media Organization</option>
                      <option value="Organization">Organization</option>
                      <option value="OnlineBusiness">Online Business</option>
                    </select>
                  </Row>
                  <Row label="Organization name">
                    <input value={s.org_name} placeholder={siteName} onChange={(e) => set("org_name", e.target.value)} />
                  </Row>
                  <Row label="Logo for Google" hint="Square or wide, at least 112×112px.">
                    <LogoPicker value={s.org_logo} onChange={(v) => set("org_logo", v)} />
                  </Row>
                </>
              ) : (
                <Row label="Person name">
                  <input value={s.person_name} onChange={(e) => set("person_name", e.target.value)} />
                </Row>
              )}
              <Row label="Publisher in article schema">
                <Switch checked={s.publisher_schema} onChange={(v) => set("publisher_schema", v)} />
              </Row>
              <Row label="Breadcrumb schema">
                <Switch checked={s.breadcrumbs_schema} onChange={(v) => set("breadcrumbs_schema", v)} />
              </Row>
              <Row label="FAQ schema from post FAQs">
                <Switch checked={s.faq_schema} onChange={(v) => set("faq_schema", v)} />
              </Row>
            </>
          )}

          {tab === "social" && (
            <>
              <Row label="Default share image" hint="Used when a page has no featured image. 1200×630px is ideal.">
                <LogoPicker value={s.default_og_image} onChange={(v) => set("default_og_image", v)} />
              </Row>
              <Row label="Facebook page URL">
                <input value={s.facebook_url} placeholder="https://facebook.com/yourpage" onChange={(e) => set("facebook_url", e.target.value)} />
              </Row>
              <Row label="X (Twitter) username">
                <input value={s.twitter_username} placeholder="@yourname" onChange={(e) => set("twitter_username", e.target.value)} />
              </Row>
              <Row label="Other profiles" hint="One URL per line (YouTube, Instagram, LinkedIn, Wikipedia…). Added to the organization schema as sameAs.">
                <textarea rows={4} value={s.same_as} onChange={(e) => set("same_as", e.target.value)} />
              </Row>
            </>
          )}

          {tab === "indexing" && (
            <>
              <Row label="Max image preview" hint="“Large” lets Google show big images in Discover and News.">
                <select value={s.max_image_preview} onChange={(e) => set("max_image_preview", e.target.value as SeoSettings["max_image_preview"])}>
                  <option value="large">Large (recommended)</option>
                  <option value="standard">Standard</option>
                  <option value="none">None</option>
                </select>
              </Row>
              <Row label="Hide tag pages from Google">
                <Switch checked={s.noindex_tags} onChange={(v) => set("noindex_tags", v)} />
              </Row>
              <Row label="Hide author pages from Google">
                <Switch checked={s.noindex_authors} onChange={(v) => set("noindex_authors", v)} />
              </Row>
              <Row label="Hide page 2, 3… of lists">
                <Switch checked={s.noindex_paginated} onChange={(v) => set("noindex_paginated", v)} />
              </Row>
              <Row label="Hide empty categories">
                <Switch checked={s.noindex_empty_categories} onChange={(v) => set("noindex_empty_categories", v)} />
              </Row>
              <Row label="Google News sitemap" hint="/sitemap-news.xml — posts from the last 2 days.">
                <Switch checked={s.news_sitemap} onChange={(v) => set("news_sitemap", v)} />
              </Row>
              <div className="seo-links">
                <a href="/sitemap.xml" target="_blank" rel="noopener">
                  <i className="fas fa-sitemap" /> sitemap.xml
                </a>
                <a href="/sitemap-news.xml" target="_blank" rel="noopener">
                  <i className="fas fa-newspaper" /> sitemap-news.xml
                </a>
                <a href="/feed" target="_blank" rel="noopener">
                  <i className="fas fa-rss" /> /feed
                </a>
                <a href="/robots.txt" target="_blank" rel="noopener">
                  <i className="fas fa-robot" /> robots.txt
                </a>
              </div>
            </>
          )}

          {tab === "webmaster" && (
            <>
              <p className="seo-help">Paste the verification code (or the whole &lt;meta&gt; tag) from each search engine. Sitemap to submit: <code>{siteUrl}/sitemap.xml</code></p>
              <Row label="Google Search Console">
                <input value={s.google_verification} onChange={(e) => set("google_verification", e.target.value)} />
              </Row>
              <Row label="Bing Webmaster Tools">
                <input value={s.bing_verification} onChange={(e) => set("bing_verification", e.target.value)} />
              </Row>
              <Row label="Yandex">
                <input value={s.yandex_verification} onChange={(e) => set("yandex_verification", e.target.value)} />
              </Row>
              <Row label="Pinterest">
                <input value={s.pinterest_verification} onChange={(e) => set("pinterest_verification", e.target.value)} />
              </Row>
            </>
          )}

          {tab === "redirects" && (
            <>
              <Row label="Redirect missing pages" hint="Send visitors who open a page that doesn't exist to another address instead of the 404 page.">
                <Switch checked={s.redirect_404_enabled} onChange={(v) => set("redirect_404_enabled", v)} />
              </Row>
              <Row label="Redirect to">
                <input value={s.redirect_404_url} placeholder="/ or https://…" onChange={(e) => set("redirect_404_url", e.target.value)} />
              </Row>
            </>
          )}

          <div className="seo-actions">
            {msg && <span className={msg.ok ? "ok" : "err"}>{msg.text}</span>}
            <button type="button" className="seo-btn" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
