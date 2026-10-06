"use client";

import { useState } from "react";
import { saveSeoSettings } from "@/lib/seo/actions";
import { SCHEMA_TYPES, type SeoSettings, type SchemaType } from "@/lib/seo/settings";
import { LogoPicker, Switch } from "./SeoAdmin";

const STEPS = ["Your site", "Identity", "Article schema", "Social profiles", "Search engines", "Indexing", "Done"];

const SITE_TYPES: { v: SeoSettings["site_type"]; label: string; icon: string; schema: SchemaType; org: SeoSettings["org_type"] }[] = [
  { v: "news", label: "News website", icon: "fa-newspaper", schema: "NewsArticle", org: "NewsMediaOrganization" },
  { v: "blog", label: "Blog", icon: "fa-pen-nib", schema: "BlogPosting", org: "Organization" },
  { v: "magazine", label: "Online magazine", icon: "fa-book-open", schema: "Article", org: "NewsMediaOrganization" },
  { v: "personal", label: "Personal site", icon: "fa-user", schema: "BlogPosting", org: "Organization" },
  { v: "business", label: "Business website", icon: "fa-briefcase", schema: "Article", org: "OnlineBusiness" },
];

/** SEO setup wizard (like Yoast / Rank Math first-run setup). */
export function SeoWizard({ initial, siteName }: { initial: SeoSettings; siteName: string }) {
  const [s, setS] = useState<SeoSettings>({ ...initial, org_name: initial.org_name || siteName });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof SeoSettings>(k: K, v: SeoSettings[K]) => setS((x) => ({ ...x, [k]: v }));

  async function next() {
    if (step === STEPS.length - 2) {
      setSaving(true);
      const r = await saveSeoSettings({ ...s, configured: true });
      setSaving(false);
      if (!r.ok) return setError(r.error ?? "Could not save.");
    }
    setError("");
    setStep((x) => Math.min(STEPS.length - 1, x + 1));
  }

  return (
    <div className="seo-wizard">
      <ol className="seo-steps">
        {STEPS.map((label, i) => (
          <li key={label} className={i < step ? "done" : i === step ? "current" : ""}>
            <span>{i < step ? <i className="fas fa-check" /> : i + 1}</span>
            <em>{label}</em>
          </li>
        ))}
      </ol>

      <div className="seo-wizard-card">
        {step === 0 && (
          <>
            <h2>What kind of website is this?</h2>
            <p>This sets the right schema for Google — News Article for news sites, Blog Post for blogs.</p>
            <div className="seo-type-grid">
              {SITE_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.v}
                  className={s.site_type === t.v ? "active" : ""}
                  onClick={() => setS((x) => ({ ...x, site_type: t.v, default_schema: t.schema, org_type: t.org }))}
                >
                  <i className={`fas ${t.icon}`} />
                  <strong>{t.label}</strong>
                  <small>{SCHEMA_TYPES[t.schema]} schema</small>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Who is behind this website?</h2>
            <p>Google shows this in the knowledge panel and uses it as the publisher of every article.</p>
            <div className="seo-seg">
              {(["organization", "person"] as const).map((v) => (
                <button type="button" key={v} className={s.represents === v ? "active" : ""} onClick={() => set("represents", v)}>
                  {v === "organization" ? "Organization / publication" : "A person"}
                </button>
              ))}
            </div>
            {s.represents === "organization" ? (
              <>
                <label className="seo-wl">
                  Name
                  <input value={s.org_name} onChange={(e) => set("org_name", e.target.value)} />
                </label>
                <label className="seo-wl">Logo</label>
                <LogoPicker value={s.org_logo} onChange={(v) => set("org_logo", v)} />
              </>
            ) : (
              <label className="seo-wl">
                Your name
                <input value={s.person_name} onChange={(e) => set("person_name", e.target.value)} />
              </label>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2>Default schema type for posts</h2>
            <p>Each post can still choose its own type in its SEO box.</p>
            <div className="seo-schema-list">
              {(Object.keys(SCHEMA_TYPES) as SchemaType[]).map((k) => (
                <label key={k} className={s.default_schema === k ? "active" : ""}>
                  <input type="radio" name="schema" checked={s.default_schema === k} onChange={() => set("default_schema", k)} />
                  {SCHEMA_TYPES[k]}
                  {k === "NewsArticle" && <span className="seo-badge">Best for news</span>}
                  {k === "BlogPosting" && <span className="seo-badge">Best for blogs</span>}
                </label>
              ))}
            </div>
            <label className="seo-wl seo-wl-row">
              <Switch checked={s.faq_schema} onChange={(v) => set("faq_schema", v)} /> Add FAQ schema from post FAQs
            </label>
            <label className="seo-wl seo-wl-row">
              <Switch checked={s.breadcrumbs_schema} onChange={(v) => set("breadcrumbs_schema", v)} /> Add breadcrumb schema
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Social profiles</h2>
            <p>Linking your profiles helps Google connect them to your site.</p>
            <label className="seo-wl">
              Facebook page
              <input value={s.facebook_url} placeholder="https://facebook.com/…" onChange={(e) => set("facebook_url", e.target.value)} />
            </label>
            <label className="seo-wl">
              X (Twitter) username
              <input value={s.twitter_username} placeholder="@…" onChange={(e) => set("twitter_username", e.target.value)} />
            </label>
            <label className="seo-wl">
              Other profiles (one per line)
              <textarea rows={3} value={s.same_as} placeholder="https://youtube.com/@…" onChange={(e) => set("same_as", e.target.value)} />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Verify with search engines</h2>
            <p>Optional. Paste the code or whole meta tag from Google Search Console and Bing Webmaster Tools.</p>
            <label className="seo-wl">
              Google Search Console
              <input value={s.google_verification} onChange={(e) => set("google_verification", e.target.value)} />
            </label>
            <label className="seo-wl">
              Bing Webmaster Tools
              <input value={s.bing_verification} onChange={(e) => set("bing_verification", e.target.value)} />
            </label>
          </>
        )}

        {step === 5 && (
          <>
            <h2>What should Google index?</h2>
            <p>Recommended settings are already selected.</p>
            <label className="seo-wl seo-wl-row">
              <Switch checked={s.news_sitemap} onChange={(v) => set("news_sitemap", v)} /> Google News sitemap
            </label>
            <label className="seo-wl seo-wl-row">
              <Switch checked={s.noindex_empty_categories} onChange={(v) => set("noindex_empty_categories", v)} /> Hide empty categories
            </label>
            <label className="seo-wl seo-wl-row">
              <Switch checked={s.noindex_tags} onChange={(v) => set("noindex_tags", v)} /> Hide tag pages
            </label>
            <label className="seo-wl seo-wl-row">
              <Switch checked={s.noindex_paginated} onChange={(v) => set("noindex_paginated", v)} /> Hide page 2, 3… of lists
            </label>
            <label className="seo-wl seo-wl-row">
              <Switch checked={s.max_image_preview === "large"} onChange={(v) => set("max_image_preview", v ? "large" : "standard")} /> Large image previews (Discover)
            </label>
          </>
        )}

        {step === 6 && (
          <div className="seo-done">
            <i className="fas fa-circle-check" />
            <h2>Your site is ready for search engines</h2>
            <p>Next: submit your sitemap in Google Search Console, and fill the SEO box (focus keyword, meta description) on each post.</p>
            <a className="seo-btn" href="/admin/seo">
              Go to SEO settings
            </a>
          </div>
        )}

        {error && <p className="seo-err">{error}</p>}
        {step < STEPS.length - 1 && (
          <div className="seo-wizard-nav">
            {step > 0 ? (
              <button type="button" className="seo-btn-light" onClick={() => setStep((x) => x - 1)}>
                Back
              </button>
            ) : (
              <a className="seo-btn-link" href="/admin/seo">
                Skip wizard
              </a>
            )}
            <button type="button" className="seo-btn" onClick={next} disabled={saving}>
              {step === STEPS.length - 2 ? (saving ? "Saving…" : "Save & finish") : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
