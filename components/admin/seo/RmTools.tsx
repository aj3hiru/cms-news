"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearIndexNowHistory, importSeoSettings, resetSeoSettings, submitIndexNowUrls } from "@/lib/seo/actions";
import type { SeoSettings } from "@/lib/seo/settings";
import type { SeoCheck } from "@/lib/seo/analyzer";
import type { IndexNowLogEntry } from "@/lib/indexNow";
import { RmTop } from "./RmUi";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

function VTabs({ tabs, tab, onTab }: { tabs: [string, string, string][]; tab: string; onTab: (t: string) => void }) {
  return (
    <nav className="rm-vtabs">
      {tabs.map(([id, label, icon]) => (
        <div key={id} className="rm-vtab-item">
          <button type="button" className={tab === id ? "on" : ""} onClick={() => onTab(id)}>
            <i className={`fas ${icon}`} /> {label}
          </button>
        </div>
      ))}
    </nav>
  );
}

function useTab(initial: string, valid: string[]) {
  const [tab, setTab] = useState(valid.includes(initial) ? initial : valid[0]);
  return [
    tab,
    (t: string) => {
      setTab(t);
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("tab", t);
        window.history.replaceState(null, "", u.toString());
      } catch {
        /* ignore */
      }
    },
  ] as const;
}

/* ── SEO Analyzer ─────────────────────────────────────────────────────────── */

export function RmAnalyzer({ checks, score, ranAt }: { checks: SeoCheck[]; score: number; ranAt: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#f59e0b" : "#dc2626";
  const groups = [...new Set(checks.map((c) => c.group))];
  const count = (st: string) => checks.filter((c) => c.state === st).length;
  const icon = { ok: "fa-circle-check", warn: "fa-triangle-exclamation", bad: "fa-circle-xmark", info: "fa-circle-info" };
  return (
    <div className="rm">
      <RmTop view="analyzer" />
      <div className="rm-card">
        <div className="rm-score">
          <div className="rm-gauge" style={{ ["--p" as string]: score, ["--c" as string]: color }}>
            <span>{score}</span>
          </div>
          <div>
            <h2>SEO Analyzer</h2>
            <p className="rm-desc">
              {count("ok")} passed · {count("warn")} warnings · {count("bad")} failed · last run {fmt(ranAt)}
            </p>
            <button type="button" className="rm-btn primary" disabled={pending} onClick={() => start(() => router.refresh())}>
              <i className={`fas ${pending ? "fa-spinner fa-spin" : "fa-rotate"}`} /> {pending ? "Analyzing…" : "Start SEO Analyzer again"}
            </button>
          </div>
        </div>
        {groups.map((g) => (
          <div key={g}>
            <div className="rm-group">{g}</div>
            <ul className="rm-checklist">
              {checks
                .filter((c) => c.group === g)
                .map((c) => (
                  <li key={c.id} className={c.state}>
                    <i className={`fas ${icon[c.state]}`} />
                    <div>
                      <b>{c.title}</b>
                      <small>{c.detail}</small>
                    </div>
                    {c.fix && c.state !== "ok" && <Link href={c.fix.href}>{c.fix.label} →</Link>}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Instant Indexing ─────────────────────────────────────────────────────── */

export function RmIndexing({ log, keyUrl, moduleOn, initialTab }: { log: IndexNowLogEntry[]; keyUrl: string; moduleOn: boolean; initialTab?: string }) {
  const router = useRouter();
  const [tab, setTab] = useTab(initialTab ?? "submit", ["submit", "history", "settings"]);
  const [urls, setUrls] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const r = await submitIndexNowUrls(urls);
    setBusy(false);
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) setUrls("");
    router.refresh();
  }

  return (
    <div className="rm">
      <RmTop view="indexing" />
      <div className="rm-card">
        <div className="rm-card-head">
          <h2>Instant Indexing</h2>
          <p>Directly notify search engines like Bing &amp; Yandex using the IndexNow API when pages are added or updated, or submit URLs manually.</p>
        </div>
        <div className="rm-wrap">
          <VTabs tabs={[["submit", "Submit URLs", "fa-paper-plane"], ["history", "History", "fa-clock-rotate-left"], ["settings", "Settings", "fa-gear"]]} tab={tab} onTab={setTab} />
          <div className="rm-fields">
            {tab === "submit" && (
              <div className="rm-row">
                <div className="lbl">URLs</div>
                <div>
                  <textarea className="rm-in" rows={8} value={urls} onChange={(e) => setUrls(e.target.value)} placeholder={"https://example.com/my-post\n/another-post"} />
                  <p className="rm-desc">Insert URLs to send to the IndexNow API (one per line, up to 10,000). Full addresses or paths like <code>/my-post</code>.</p>
                  <button type="button" className="rm-btn primary" disabled={busy || !urls.trim()} onClick={submit}>
                    {busy ? "Submitting…" : "Submit URLs"}
                  </button>
                  {msg && <p className={msg.ok ? "rm-ok" : "rm-err"}>{msg.text}</p>}
                </div>
              </div>
            )}
            {tab === "history" && (
              <>
                <div className="rm-row-head">
                  <span>The last {log.length} submissions (automatic ones are sent when a post is published or updated).</span>
                  {log.length > 0 && (
                    <button
                      type="button"
                      className="rm-btn danger"
                      onClick={async () => {
                        if (!window.confirm("Clear the submission history?")) return;
                        await clearIndexNowHistory();
                        router.refresh();
                      }}
                    >
                      Clear History
                    </button>
                  )}
                </div>
                {log.length === 0 ? (
                  <p className="rm-desc">No submissions yet.</p>
                ) : (
                  <div className="rm-table-wrap">
                    <table className="rm-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>URL</th>
                          <th>Submission</th>
                          <th>Response</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.map((l, i) => (
                          <tr key={i}>
                            <td>{fmt(l.at)}</td>
                            <td>
                              {l.urls.slice(0, 3).map((u) => (
                                <div key={u}>{u}</div>
                              ))}
                              {l.urls.length > 3 && <small>+{l.urls.length - 3} more</small>}
                            </td>
                            <td>{l.manual ? "Manual" : "Auto"}</td>
                            <td>
                              <span className={`rm-pill ${l.ok ? "ok" : "bad"}`}>{l.status || "—"}</span> {l.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            {tab === "settings" && (
              <>
                <div className="rm-row">
                  <div className="lbl">Automatic submission</div>
                  <div>
                    <span className={`rm-pill ${moduleOn ? "ok" : "bad"}`}>{moduleOn ? "On" : "Off"}</span>
                    <p className="rm-desc">
                      New and updated posts are sent automatically while the Instant Indexing module is on. <Link href="/admin/seo">Change it on the Dashboard</Link>.
                    </p>
                  </div>
                </div>
                <div className="rm-row">
                  <div className="lbl">API Key</div>
                  <div>
                    <input className="rm-in" readOnly value={keyUrl} />
                    <p className="rm-desc">
                      The IndexNow key file. Search engines read it to confirm the URLs are yours. <a href={keyUrl} target="_blank" rel="noopener">Check the key</a>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Status & Tools ───────────────────────────────────────────────────────── */

export function RmStatus({ settings, system, initialTab }: { settings: SeoSettings; system: [string, string][]; initialTab?: string }) {
  const router = useRouter();
  const [tab, setTab] = useTab(initialTab ?? "importexport", ["importexport", "tools", "system"]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify({ type: "seo-settings", exported: new Date().toISOString(), settings }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `seo-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importJson() {
    const f = file.current?.files?.[0];
    if (!f) return setMsg({ ok: false, text: "Choose a settings file first." });
    const r = await importSeoSettings(await f.text());
    setMsg(r.ok ? { ok: true, text: `Imported ${r.count} settings.` } : { ok: false, text: r.error ?? "Could not import." });
    if (r.ok) router.refresh();
  }

  async function reset() {
    if (!window.confirm("Reset ALL SEO settings to their defaults? The setup wizard will run again.")) return;
    const r = await resetSeoSettings();
    setMsg(r.ok ? { ok: true, text: "All SEO settings are back to their defaults." } : { ok: false, text: r.error ?? "Could not reset." });
    router.refresh();
  }

  return (
    <div className="rm">
      <RmTop view="status" />
      <div className="rm-card">
        <div className="rm-card-head">
          <h2>Status &amp; Tools</h2>
          <p>Back up, move or reset your SEO settings, and see the system status.</p>
        </div>
        <div className="rm-wrap">
          <VTabs tabs={[["importexport", "Import & Export", "fa-right-left"], ["tools", "Database Tools", "fa-database"], ["system", "System Status", "fa-server"]]} tab={tab} onTab={setTab} />
          <div className="rm-fields">
            {msg && <div className={msg.ok ? "rm-info" : "rm-warn bad"}>{msg.text}</div>}
            {tab === "importexport" && (
              <>
                <div className="rm-row">
                  <div className="lbl">Export Settings</div>
                  <div>
                    <button type="button" className="rm-btn primary" onClick={exportJson}>
                      <i className="fas fa-download" /> Export
                    </button>
                    <p className="rm-desc">Download every SEO setting as a JSON file (a backup, or to copy the setup to another site).</p>
                  </div>
                </div>
                <div className="rm-row">
                  <div className="lbl">Import Settings</div>
                  <div>
                    <input ref={file} type="file" accept="application/json,.json" />
                    <div style={{ marginTop: 10 }}>
                      <button type="button" className="rm-btn" onClick={importJson}>
                        <i className="fas fa-upload" /> Import
                      </button>
                    </div>
                    <p className="rm-desc">Import a file made by Export. Only SEO settings are changed; unknown values are ignored.</p>
                  </div>
                </div>
              </>
            )}
            {tab === "tools" && (
              <>
                <div className="rm-row">
                  <div className="lbl">Re-run Setup Wizard</div>
                  <div>
                    <Link className="rm-btn" href="/admin/seo/wizard">
                      Setup Wizard
                    </Link>
                    <p className="rm-desc">Walk through the main options again; nothing is changed until you save a step.</p>
                  </div>
                </div>
                <div className="rm-row">
                  <div className="lbl">Reset All Settings</div>
                  <div>
                    <button type="button" className="rm-btn danger" onClick={reset}>
                      Reset
                    </button>
                    <p className="rm-desc">Puts every SEO option back to its default. Posts and their own SEO fields are not touched. Export first if you may want them back.</p>
                  </div>
                </div>
              </>
            )}
            {tab === "system" && (
              <table className="rm-table">
                <tbody>
                  {system.map(([k, v]) => (
                    <tr key={k}>
                      <th style={{ width: "40%" }}>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
