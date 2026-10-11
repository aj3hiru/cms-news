"use client";

import { useMemo, useState } from "react";
import { saveSeoSettings } from "@/lib/seo/actions";
import { SEO_DEFAULTS, type SeoSettings } from "@/lib/seo/settings";
import { SEO_SCREENS, type SeoField } from "@/lib/seo/screens";
import { RmImage, RmSwitch, RmTop } from "./RmUi";

type Vals = SeoSettings;

function previewTpl(v: string, sep: string, site: string) {
  if (!v) return "";
  return v
    .replace(/%title%/g, "Your Post Title")
    .replace(/%term%/g, "Category Name")
    .replace(/%name%/g, "Author Name")
    .replace(/%search_query%/g, "search words")
    .replace(/%excerpt%/g, "The first lines of the post…")
    .replace(/%term_description%/g, "Category description")
    .replace(/%user_description%/g, "Author bio")
    .replace(/%category%/g, "Category")
    .replace(/%sitename%/g, site)
    .replace(/%sep%|%separator%/g, sep)
    .replace(/%currentyear%/g, String(new Date().getFullYear()))
    .replace(/%[a-z_]+%/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** One Rank Math settings screen: header card, vertical tabs, label | field rows, Reset Options / Save Changes. */
export function RmSettings({ screen, initial, siteName, siteUrl, initialTab, robotsDefault }: { screen: "general" | "titles" | "sitemap"; initial: SeoSettings; siteName: string; siteUrl: string; initialTab?: string; robotsDefault?: string }) {
  const def = SEO_SCREENS.find((s) => s.id === screen)!;
  const [s, setS] = useState<Vals>(initial);
  const [tab, setTab] = useState(def.tabs.some((t) => t.id === initialTab) ? initialTab! : def.tabs[0].id);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const cur = def.tabs.find((t) => t.id === tab)!;
  const set = <K extends keyof Vals>(k: K, v: Vals[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setMsg(null);
  };
  const keys = useMemo(() => def.tabs.flatMap((t) => t.fields.map((f) => f.k)).filter((k): k is keyof SeoSettings => !String(k).startsWith("__")), [def]);
  const extra: (keyof SeoSettings)[] = screen === "titles" ? ["robots_nofollow", "robots_noarchive", "robots_noimageindex", "robots_nosnippet", "max_snippet", "max_video_preview", "max_image_preview"] : [];

  function pickTab(id: string) {
    setTab(id);
    setMsg(null);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("tab", id);
      window.history.replaceState(null, "", u.toString());
    } catch {
      /* ignore */
    }
  }

  async function save(patch?: Partial<SeoSettings>) {
    setSaving(true);
    const body = patch ?? Object.fromEntries([...keys, ...extra].map((k) => [k, s[k]]));
    const r = await saveSeoSettings(body as Partial<SeoSettings>);
    setSaving(false);
    setMsg(r.ok ? { ok: true, text: "Settings saved." } : { ok: false, text: r.error ?? "Could not save." });
  }

  async function reset() {
    if (!window.confirm(`Reset every option on “${def.title}” to its default value?`)) return;
    const patch = Object.fromEntries([...keys, ...extra].map((k) => [k, SEO_DEFAULTS[k]])) as Partial<SeoSettings>;
    setS((x) => ({ ...x, ...patch }));
    await save(patch);
  }

  function field(f: SeoField) {
    const k = f.k as keyof Vals;
    switch (f.t) {
      case "toggle":
        return <RmSwitch checked={Boolean(s[k])} onChange={(v) => set(k, v as never)} label={f.label} />;
      case "text":
        return <input className="rm-in" value={String(s[k] ?? "")} placeholder={f.placeholder} onChange={(e) => set(k, e.target.value as never)} />;
      case "number":
        return <input className="rm-in rm-num" type="number" value={Number(s[k])} onChange={(e) => set(k, Number(e.target.value) as never)} />;
      case "textarea":
        return <textarea className="rm-in" rows={4} value={String(s[k] ?? "")} placeholder={f.placeholder} onChange={(e) => set(k, e.target.value as never)} />;
      case "code":
        return <textarea className="rm-in code" spellCheck={false} value={String(s[k] ?? "")} placeholder={robotsDefault ?? ""} onChange={(e) => set(k, e.target.value as never)} />;
      case "select":
        return (
          <select className="rm-in" value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)}>
            {Object.entries(f.opts ?? {}).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        );
      case "seg":
        return (
          <div className="rm-seg">
            {Object.entries(f.opts ?? {}).map(([v, l]) => (
              <button type="button" key={v} className={String(s[k]) === v ? "on" : ""} onClick={() => set(k, v as never)}>
                {l}
              </button>
            ))}
          </div>
        );
      case "image":
        return <RmImage value={String(s[k] ?? "")} onChange={(v) => set(k, v as never)} />;
      case "tpl":
        return (
          <>
            <input className="rm-in" value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
            {s[k] ? <div className="rm-prev">Preview: {previewTpl(String(s[k]), s.separator, siteName)}</div> : null}
          </>
        );
      case "robots":
        return (
          <div className="rm-checks">
            <label>
              <input type="checkbox" checked={!s.noindex_site} onChange={(e) => set("noindex_site", !e.target.checked)} /> Index
            </label>
            <label>
              <input type="checkbox" checked={s.noindex_site} onChange={(e) => set("noindex_site", e.target.checked)} /> No Index
            </label>
            {(
              [
                ["robots_nofollow", "No Follow"],
                ["robots_noarchive", "No Archive"],
                ["robots_noimageindex", "No Image Index"],
                ["robots_nosnippet", "No Snippet"],
              ] as const
            ).map(([rk, l]) => (
              <label key={rk}>
                <input type="checkbox" checked={s[rk]} onChange={(e) => set(rk, e.target.checked)} /> {l}
              </label>
            ))}
          </div>
        );
      case "advrobots":
        return (
          <div className="rm-adv">
            <div>
              <label>Max Snippet</label>
              <input className="rm-in" type="number" value={s.max_snippet} onChange={(e) => set("max_snippet", Number(e.target.value))} />
            </div>
            <div>
              <label>Max Video Preview</label>
              <input className="rm-in" type="number" value={s.max_video_preview} onChange={(e) => set("max_video_preview", Number(e.target.value))} />
            </div>
            <div>
              <label>Max Image Preview</label>
              <select className="rm-in" value={s.max_image_preview} onChange={(e) => set("max_image_preview", e.target.value as SeoSettings["max_image_preview"])}>
                <option value="large">Large</option>
                <option value="standard">Standard</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        );
      case "info":
        return (
          <div className="rm-info">
            Your sitemap index can be found here:{" "}
            <a href={`${siteUrl}/sitemap_index.xml`} target="_blank" rel="noopener">
              {siteUrl}/sitemap_index.xml
            </a>
            {s.news_sitemap && (
              <>
                <br />
                News sitemap:{" "}
                <a href={`${siteUrl}/news-sitemap.xml`} target="_blank" rel="noopener">
                  {siteUrl}/news-sitemap.xml
                </a>
              </>
            )}
            {!s.m_sitemap && (
              <>
                <br />
                <b>The Sitemap module is off</b> — turn it on in SEO → Dashboard.
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="rm">
      <RmTop view={screen} />
      <div className="rm-card">
        <div className="rm-card-head">
          <h2>{cur.title}</h2>
          <p>{cur.desc}</p>
        </div>
        <div className="rm-wrap">
          <nav className="rm-vtabs" aria-label={def.title}>
            {def.tabs.map((t) => (
              <div key={t.id} className="rm-vtab-item">
                {t.group && <div className="grp">{t.group}</div>}
                <button type="button" className={t.id === tab ? "on" : ""} onClick={() => pickTab(t.id)}>
                  <i className={`fas ${t.icon}`} /> {t.title}
                </button>
              </div>
            ))}
          </nav>
          <div className="rm-fields">
            {cur.fields.map((f) =>
              f.t === "info" ? (
                <div key={f.k} className="rm-row rm-row-full">
                  {field(f)}
                </div>
              ) : (
                <div key={f.k} className="rm-row">
                  <div className="lbl">{f.label}</div>
                  <div>
                    {field(f)}
                    {f.desc && <p className="rm-desc" dangerouslySetInnerHTML={{ __html: f.desc }} />}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
        <div className="rm-foot">
          <button type="button" className="rm-btn" onClick={reset} disabled={saving}>
            Reset Options
          </button>
          <div className="rm-foot-r">
            {msg && <span className={msg.ok ? "rm-ok" : "rm-err"}>{msg.text}</span>}
            <button type="button" className="rm-btn primary" onClick={() => save()} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
