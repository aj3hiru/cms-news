"use client";

import { useState } from "react";
import Link from "next/link";
import { saveSeoSettings } from "@/lib/seo/actions";
import { SCHEMA_TYPES, type SeoSettings, type SchemaType } from "@/lib/seo/settings";
import { RmImage, RmSwitch } from "./RmUi";

type Step = "start" | "yoursite" | "analytics" | "sitemaps" | "optimization" | "ready" | "role" | "redirection" | "schema";
const MAIN: [Step, string][] = [
  ["start", "Getting Started"],
  ["yoursite", "Your Site"],
  ["analytics", "Search Console"],
  ["sitemaps", "Sitemaps"],
  ["optimization", "Optimization"],
  ["ready", "Ready"],
];
const ADV: [Step, string][] = [
  ["role", "Role Manager"],
  ["redirection", "404 + Redirection"],
  ["schema", "Schema Markup"],
];

/** "My Website is a…" → site type, article schema and organization type. */
const SITE_TYPES: { v: string; label: string; site: SeoSettings["site_type"]; schema: SchemaType; org: SeoSettings["org_type"]; who: SeoSettings["represents"] }[] = [
  { v: "news", label: "Community Blog/News Site", site: "news", schema: "NewsArticle", org: "NewsMediaOrganization", who: "organization" },
  { v: "blog", label: "Personal Blog", site: "personal", schema: "BlogPosting", org: "Organization", who: "person" },
  { v: "magazine", label: "Online Magazine", site: "magazine", schema: "Article", org: "NewsMediaOrganization", who: "organization" },
  { v: "business", label: "Small Business Site", site: "business", schema: "Article", org: "OnlineBusiness", who: "organization" },
  { v: "other", label: "Other Business Website", site: "business", schema: "Article", org: "Organization", who: "organization" },
];

function Row({ label, desc, children }: { label: string; desc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rmw-row">
      <div className="lbl">{label}</div>
      <div>
        {children}
        {desc && <p className="rm-desc">{desc}</p>}
      </div>
    </div>
  );
}

export function RmWizard({ initial, siteName, siteUrl, initialStep }: { initial: SeoSettings; siteName: string; siteUrl: string; initialStep?: string }) {
  const [s, setS] = useState<SeoSettings>({ ...initial, org_name: initial.org_name || siteName });
  const all = [...MAIN, ...ADV].map(([k]) => k);
  const [step, setStepState] = useState<Step>(all.includes(initialStep as Step) ? (initialStep as Step) : "start");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof SeoSettings>(k: K, v: SeoSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const adv = ADV.some(([k]) => k === step);
  const list = adv ? ADV : MAIN;
  const idx = list.findIndex(([k]) => k === step);
  const siteType = SITE_TYPES.find((t) => t.site === s.site_type && t.schema === s.default_schema) ?? SITE_TYPES.find((t) => t.site === s.site_type) ?? SITE_TYPES[0];

  function go(next: Step) {
    setStepState(next);
    setErr("");
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("step", next);
      window.history.replaceState(null, "", u.toString());
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }

  const FIELDS: Partial<Record<Step, (keyof SeoSettings)[]>> = {
    start: ["wizard_level"],
    yoursite: ["site_type", "default_schema", "org_type", "represents", "org_name", "person_name", "org_logo", "default_og_image"],
    analytics: ["google_verification", "bing_verification"],
    sitemaps: ["m_sitemap", "sm_images", "sm_posts", "sm_pages", "sm_categories", "sm_tags", "sm_authors", "news_sitemap", "news_name"],
    optimization: ["noindex_empty_categories", "nofollow_external", "external_blank"],
    role: ["m_role_manager", "role_editor_seo", "role_author_seo"],
    redirection: ["redirect_404_enabled", "redirect_404_url"],
    schema: ["m_schema", "default_schema"],
  };

  async function saveAnd(next: Step, extra: Partial<SeoSettings> = {}) {
    setBusy(true);
    const patch = { ...Object.fromEntries((FIELDS[step] ?? []).map((k) => [k, s[k]])), ...extra } as Partial<SeoSettings>;
    const r = await saveSeoSettings(patch);
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not save.");
    setS((x) => ({ ...x, ...extra }));
    go(next);
  }

  const nextOf = (st: Step): Step => {
    const l = ADV.some(([k]) => k === st) ? ADV : MAIN;
    const i = l.findIndex(([k]) => k === st);
    return i < l.length - 1 ? l[i + 1][0] : "ready";
  };

  const foot = (opts: { skip?: boolean; label?: string; extra?: Partial<SeoSettings> } = {}) => (
    <div className="rmw-foot">
      {opts.skip !== false ? (
        <button type="button" className="rm-btn" onClick={() => go(nextOf(step))} disabled={busy}>
          Skip Step
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="rm-btn primary big" disabled={busy} onClick={() => saveAnd(nextOf(step), { ...(nextOf(step) === "ready" ? { configured: true } : {}), ...opts.extra })}>
        {busy ? "Saving…" : opts.label ?? "Save and Continue"}
      </button>
    </div>
  );

  return (
    <div className="rmw">
      <div className="rmw-logo">
        <i className="fas fa-chart-simple" /> <b>Rank</b>Math <small>SEO</small>
      </div>
      <ol className="rmw-steps" style={{ ["--n" as string]: list.length }}>
        {list.map(([k, label], i) => (
          <li key={k} className={i < idx ? "done" : i === idx ? "cur" : ""}>
            <span className="t">{label}</span>
            <span className="d" />
          </li>
        ))}
      </ol>

      <div className="rmw-card">
        {err && <div className="rm-warn bad">{err}</div>}

        {step === "start" && (
          <>
            <h1>Getting Started</h1>
            <p className="rmw-sub">Choose how much you want to set yourself.</p>
            <div className="rmw-modes">
              {(
                [
                  ["easy", "Easy", "For websites where you only want to change the basics and let the SEO do most of the heavy lifting. Most settings are set to default as per industry best practices. One just has to set it and forget it."],
                  ["advanced", "Advanced", "For the advanced users who want to control every SEO aspect of the website. You are offered options to change everything and have full control over the website’s SEO."],
                ] as const
              ).map(([v, t, d]) => (
                <label key={v} className={s.wizard_level === v ? "on" : ""}>
                  <input type="radio" name="lvl" checked={s.wizard_level === v} onChange={() => set("wizard_level", v)} />
                  <b>{t}</b>
                  <span>{d}</span>
                </label>
              ))}
              <Link className="rmw-custom" href="/admin/seo/status?tab=importexport">
                <b>Custom Mode</b>
                <span>Select this if you have a settings file (Export) you want to use.</span>
              </Link>
            </div>
            <p className="rm-desc">
              <b>Note:</b> You can easily switch between modes at any point.
            </p>
            <div className="rmw-ok">
              <i className="fas fa-circle-check" /> Your website is compatible to run the SEO module.
            </div>
            <div className="rmw-foot center">
              <button type="button" className="rm-btn primary big" disabled={busy} onClick={() => saveAnd("yoursite")}>
                Start Wizard
              </button>
            </div>
          </>
        )}

        {step === "yoursite" && (
          <>
            <h1>Your Website: {siteName}</h1>
            <p className="rmw-sub">Let us know a few things about your site…</p>
            <Row label="My Website is a…">
              <select
                className="rm-in"
                value={siteType.v}
                onChange={(e) => {
                  const t = SITE_TYPES.find((x) => x.v === e.target.value)!;
                  setS((x) => ({ ...x, site_type: t.site, default_schema: t.schema, org_type: t.org, represents: t.who }));
                }}
              >
                {SITE_TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Business Type" desc="Select the type that best describes your business. If you can't find one that applies exactly, use the generic “Organization”.">
              <select className="rm-in" value={s.org_type} onChange={(e) => set("org_type", e.target.value as SeoSettings["org_type"])}>
                <option value="NewsMediaOrganization">News Media Organization</option>
                <option value="Organization">Organization</option>
                <option value="OnlineBusiness">Online Business</option>
              </select>
            </Row>
            <Row label="Person/Organization Name" desc="Your name or company name intended to feature in Google's Knowledge Panel.">
              <input className="rm-in" value={s.represents === "person" ? s.person_name : s.org_name} onChange={(e) => set(s.represents === "person" ? "person_name" : "org_name", e.target.value)} />
            </Row>
            <Row
              label="Logo for Google"
              desc={
                <>
                  <b>Min Size: 112Χ112px.</b>
                  <br />A squared image is preferred by the search engines.
                </>
              }
            >
              <RmImage value={s.org_logo} onChange={(v) => set("org_logo", v)} />
            </Row>
            <Row
              label="Default Social Share Image"
              desc={
                <>
                  When a featured image or an OpenGraph Image is not set for individual posts/pages, this image will be used as a fallback thumbnail when your post is shared on Facebook. <b>The recommended image size is 1200 x 630 pixels.</b>
                </>
              }
            >
              <RmImage value={s.default_og_image} onChange={(v) => set("default_og_image", v)} />
            </Row>
            {foot()}
          </>
        )}

        {step === "analytics" && (
          <>
            <h1>Google Search Console</h1>
            <p className="rmw-sub">
              Verify your site, then submit <code>{siteUrl}/sitemap_index.xml</code> in Search Console → Sitemaps.
            </p>
            <Row
              label="Google Search Console"
              desc={
                <>
                  Paste the HTML tag or its code from{" "}
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener">
                    Search Console
                  </a>{" "}
                  → Settings → Ownership verification → HTML tag. Leave empty if the domain is verified by DNS.
                </>
              }
            >
              <input className="rm-in" value={s.google_verification} placeholder='<meta name="google-site-verification" content="…">' onChange={(e) => set("google_verification", e.target.value)} />
            </Row>
            <Row label="Bing Webmaster Tools" desc="Optional. Bing can also import the site straight from Search Console.">
              <input className="rm-in" value={s.bing_verification} onChange={(e) => set("bing_verification", e.target.value)} />
            </Row>
            <ul className="rmw-list">
              <li>Verify site ownership on Google Search Console</li>
              <li>Submit the sitemap index so Google finds new posts quickly</li>
              <li>Bing / Yandex get new posts instantly through IndexNow (Instant Indexing module)</li>
            </ul>
            {foot()}
          </>
        )}

        {step === "sitemaps" && (
          <>
            <h1>Sitemap</h1>
            <p className="rmw-sub">Choose your Sitemap configuration and select which type of posts or pages you want to include in your Sitemaps.</p>
            <Row label="Sitemaps" desc="XML Sitemaps help search engines index your website's content more effectively.">
              <RmSwitch checked={s.m_sitemap} onChange={(v) => set("m_sitemap", v)} label="Sitemaps" />
            </Row>
            {s.m_sitemap && (
              <>
                <Row label="Include Images" desc="Include reference to images from the post content in sitemaps. This helps search engines index your images better.">
                  <RmSwitch checked={s.sm_images} onChange={(v) => set("sm_images", v)} label="Include Images" />
                </Row>
                <Row label="Public Post Types" desc="Select post types to include them in the sitemap.">
                  <div className="rm-checks">
                    <label>
                      <input type="checkbox" checked={s.sm_posts} onChange={(e) => set("sm_posts", e.target.checked)} /> Posts
                    </label>
                    <label>
                      <input type="checkbox" checked={s.sm_pages} onChange={(e) => set("sm_pages", e.target.checked)} /> Pages
                    </label>
                  </div>
                </Row>
                <Row label="Public Taxonomies" desc="Select taxonomies to include them in the sitemap.">
                  <div className="rm-checks">
                    <label>
                      <input type="checkbox" checked={s.sm_categories} onChange={(e) => set("sm_categories", e.target.checked)} /> Categories
                    </label>
                    <label>
                      <input type="checkbox" checked={s.sm_tags} onChange={(e) => set("sm_tags", e.target.checked)} /> Tags
                    </label>
                    <label>
                      <input type="checkbox" checked={s.sm_authors} onChange={(e) => set("sm_authors", e.target.checked)} /> Authors
                    </label>
                  </div>
                </Row>
              </>
            )}
            <h3 className="rmw-h3">News Sitemap</h3>
            <p className="rm-desc">News Sitemaps allow you to control which content you submit to Google News.</p>
            <Row label="News Sitemaps" desc="You will generally only need a News Sitemap when your website is included in Google News.">
              <RmSwitch checked={s.news_sitemap} onChange={(v) => set("news_sitemap", v)} label="News Sitemaps" />
            </Row>
            {s.news_sitemap && (
              <Row label="Google News Publication Name" desc="The name of the news publication. It must match the name exactly as it appears on your articles in news.google.com. Empty = the site name.">
                <input className="rm-in" value={s.news_name} placeholder={siteName} onChange={(e) => set("news_name", e.target.value)} />
              </Row>
            )}
            {foot()}
          </>
        )}

        {step === "optimization" && (
          <>
            <h1>SEO Tweaks</h1>
            <p className="rmw-sub">Automate some of your SEO tasks like making external links nofollow.</p>
            <Row label="Noindex Empty Category and Tag Archives" desc="Setting empty archives to noindex is useful for avoiding indexation of thin content pages and dilution of page rank. As soon as a post is added, the page is updated to index.">
              <RmSwitch checked={s.noindex_empty_categories} onChange={(v) => set("noindex_empty_categories", v)} label="Noindex empty archives" />
            </Row>
            <Row label="Nofollow External Links" desc='Automatically add rel="nofollow" attribute for external links appearing in your posts and pages. The attribute is dynamically applied when the content is displayed, and the stored content is not changed.'>
              <RmSwitch checked={s.nofollow_external} onChange={(v) => set("nofollow_external", v)} label="Nofollow External Links" />
            </Row>
            <Row label="Open External Links in New Tab/Window" desc='Automatically add a target="_blank" attribute to external links appearing in your posts and pages. The attributes are applied when the content is displayed, which does not change the stored content.'>
              <RmSwitch checked={s.external_blank} onChange={(v) => set("external_blank", v)} label="Open External Links in New Tab" />
            </Row>
            {foot()}
          </>
        )}

        {step === "ready" && (
          <div className="rmw-ready">
            <div className="rmw-check">
              <i className="fas fa-check" />
            </div>
            <h1>Your site is ready!</h1>
            <p className="rmw-sub">The sitemap, schema and meta tags are live. Submit your sitemap in Google Search Console:</p>
            <p>
              <a href={`${siteUrl}/sitemap_index.xml`} target="_blank" rel="noopener">
                {siteUrl}/sitemap_index.xml
              </a>
            </p>
            <div className="rmw-foot center">
              <Link className="rm-btn" href="/admin/seo">
                Return to dashboard
              </Link>
              <button type="button" className="rm-btn primary big" onClick={() => go("role")}>
                Setup Advanced Options
              </button>
            </div>
          </div>
        )}

        {step === "role" && (
          <>
            <h1>Role Manager</h1>
            <p className="rmw-sub">Set capabilities here.</p>
            <Row label="Role Manager" desc="Control which roles can change the SEO box (title, description, focus keyword, schema) in the post editor. Admins always can.">
              <RmSwitch checked={s.m_role_manager} onChange={(v) => set("m_role_manager", v)} label="Role Manager" />
            </Row>
            {s.m_role_manager && (
              <>
                <Row label="Editors" desc="Editors can change a post’s SEO title, description, schema and social preview.">
                  <RmSwitch checked={s.role_editor_seo} onChange={(v) => set("role_editor_seo", v)} label="Editors" />
                </Row>
                <Row label="Authors" desc="Authors can change the SEO box of their own posts.">
                  <RmSwitch checked={s.role_author_seo} onChange={(v) => set("role_author_seo", v)} label="Authors" />
                </Row>
              </>
            )}
            {foot()}
          </>
        )}

        {step === "redirection" && (
          <>
            <h1>404 + Redirection</h1>
            <p className="rmw-sub">Set default values for missing pages here.</p>
            <Row label="Redirect Missing Pages" desc="Visitors (and search engines) who open an address that doesn't exist are sent to another address instead of the 404 page.">
              <RmSwitch checked={s.redirect_404_enabled} onChange={(v) => set("redirect_404_enabled", v)} label="Redirect Missing Pages" />
            </Row>
            {s.redirect_404_enabled && (
              <Row label="Redirect To" desc="A path like / or a full address.">
                <input className="rm-in" value={s.redirect_404_url} placeholder="/" onChange={(e) => set("redirect_404_url", e.target.value)} />
              </Row>
            )}
            <p className="rm-desc">
              Country-based redirects are in <Link href="/admin/country-redirection">Settings → Country Redirection</Link>.
            </p>
            {foot()}
          </>
        )}

        {step === "schema" && (
          <>
            <h1>Schema Markup</h1>
            <p className="rmw-sub">Schema adds metadata to your website, resulting in rich search results and more traffic.</p>
            <Row label="Schema Type" desc="Use automatic structured data to mark up content, to help Google better understand your content's context for display in Search.">
              <RmSwitch checked={s.m_schema} onChange={(v) => set("m_schema", v)} label="Schema" />
            </Row>
            {s.m_schema && (
              <Row label="Schema Type for Posts" desc="Default rich snippet selected when creating a new post. Each post can change it in its Schema tab.">
                <select className="rm-in" value={s.default_schema} onChange={(e) => set("default_schema", e.target.value as SchemaType)}>
                  {Object.entries(SCHEMA_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Row>
            )}
            {foot({ skip: false })}
          </>
        )}
      </div>
      <div className="rmw-back">
        <Link href="/admin/seo">Return to dashboard</Link>
      </div>
    </div>
  );
}
