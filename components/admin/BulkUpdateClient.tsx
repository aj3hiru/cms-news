"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyBulkBatch, finishBulkUpdate, getBulkSources, previewBulkUpdate, type BulkItem, type BulkScope } from "@/lib/bulkUpdate";

type Sources = Awaited<ReturnType<typeof getBulkSources>>;
type Mode = "posts" | "categories" | "tags" | "all" | "pages";
type Row = { id: number; title: string; type: "post" | "page"; at: string };

const GAPS = [0, 1, 5, 10, 15, 30, 60];
const fmt = (d: string | Date) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Tools → Bulk Update: give posts / pages fresh publish + modified dates, spaced by an interval. */
export function BulkUpdateClient({ initial }: { initial: Sources }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<Mode>("posts");
  const [sources, setSources] = useState(initial);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [pickedTitles, setPickedTitles] = useState<Record<number, string>>({});
  const [allPages, setAllPages] = useState(true);
  const [items, setItems] = useState<BulkItem[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [gap, setGap] = useState(5);
  const [customGap, setCustomGap] = useState(7);
  const [useCustom, setUseCustom] = useState(false);
  const [startMode, setStartMode] = useState<"now" | "custom">("now");
  const [startAt, setStartAt] = useState("");
  const [order, setOrder] = useState<"keep" | "shuffle">("keep");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<Row[]>([]);
  const [finished, setFinished] = useState<{ pinged: number } | null>(null);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "posts") return;
    const t = setTimeout(() => getBulkSources(q).then(setSources), 250);
    return () => clearTimeout(t);
  }, [q, mode]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [done.length]);

  const minutes = useCustom ? Math.max(0, customGap) : gap;
  const count = items?.length ?? 0;
  const pct = count ? Math.round((done.length / count) * 100) : 0;

  const schedule = useMemo(() => {
    if (!items) return [];
    const start = startMode === "custom" && startAt ? new Date(startAt).getTime() : Date.now();
    const list = order === "shuffle" ? [...items].sort(() => Math.random() - 0.5) : items;
    // First item = start time; each next one is `minutes` earlier, so the order reads naturally (newest on top).
    return list.map((it, i) => ({ ...it, at: new Date(start - i * minutes * 60_000).toISOString() }));
  }, [items, minutes, startMode, startAt, order]);

  function scope(): BulkScope {
    if (mode === "all") return { kind: "all" };
    if (mode === "pages") return { kind: "pages", ids: allPages ? "all" : [...picked] };
    return { kind: mode, ids: [...picked] } as BulkScope;
  }

  async function toStep2() {
    setLoadingPreview(true);
    setError("");
    try {
      const list = await previewBulkUpdate(scope());
      if (!list.length) return setError("Nothing matches this selection.");
      setItems(list);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the selection.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function run() {
    setStep(3);
    setRunning(true);
    setDone([]);
    setFinished(null);
    setError("");
    const all: Row[] = [];
    const slugs: { type: "post" | "page"; slug: string }[] = [];
    try {
      for (let i = 0; i < schedule.length; i += 10) {
        const chunk = schedule.slice(i, i + 10);
        const res = await applyBulkBatch(chunk.map((c) => ({ id: c.id, type: c.type, at: c.at })));
        const byId = new Map(chunk.map((c) => [`${c.type}${c.id}`, c]));
        for (const r of res) {
          const c = byId.get(`${r.type}${r.id}`);
          all.push({ id: r.id, title: c?.title ?? `#${r.id}`, type: r.type, at: r.at });
          slugs.push({ type: r.type, slug: r.slug });
        }
        setDone([...all]);
      }
      const f = await finishBulkUpdate(slugs, `Gap ${minutes} min`);
      setFinished(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The update stopped.");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setStep(1);
    setItems(null);
    setDone([]);
    setFinished(null);
    setPicked(new Set());
    setPickedTitles({});
  }

  const toggle = (id: number, title?: string) => {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    if (title) setPickedTitles((t) => ({ ...t, [id]: title }));
  };

  const canNext = mode === "all" || (mode === "pages" && allPages) || picked.size > 0;

  return (
    <div className="bu-wrap">
      <div className="bu-hero">
        <div>
          <h2>
            <i className="fas fa-clock-rotate-left" /> Bulk Update
          </h2>
          <p>Give posts and pages fresh publish &amp; modified dates — spaced out the way you choose — and tell search engines right away.</p>
        </div>
        <ol className="bu-steps">
          {["Select", "Schedule", "Update"].map((s, i) => (
            <li key={s} className={step > i + 1 ? "done" : step === i + 1 ? "current" : ""}>
              <span>{step > i + 1 ? <i className="fas fa-check" /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {step === 1 && (
        <div className="bu-card">
          <h3>What do you want to update?</h3>
          <div className="bu-modes">
            {(
              [
                ["posts", "fa-file-lines", "Single posts", "Pick one or more posts"],
                ["categories", "fa-folder", "By category", "Every post in the chosen categories"],
                ["tags", "fa-tags", "By tag", "Every post with the chosen tags"],
                ["all", "fa-layer-group", "All posts", "Every published post"],
                ["pages", "fa-file", "Pages", "About, Contact and other pages"],
              ] as const
            ).map(([m, icon, label, desc]) => (
              <button
                type="button"
                key={m}
                className={mode === m ? "active" : ""}
                onClick={() => {
                  setMode(m);
                  setPicked(new Set());
                }}
              >
                <i className={`fas ${icon}`} />
                <strong>{label}</strong>
                <small>{desc}</small>
              </button>
            ))}
          </div>

          {mode === "posts" && (
            <div className="bu-pick">
              <input className="bu-input" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="bu-list">
                {sources.posts.map((p) => (
                  <label key={p.id} className={picked.has(p.id) ? "on" : ""}>
                    <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id, p.title)} />
                    <span>{p.title}</span>
                    <em>{p.date ? fmt(p.date) : ""}</em>
                  </label>
                ))}
              </div>
              {picked.size > 0 && (
                <div className="bu-chips">
                  {[...picked].map((id) => (
                    <button type="button" key={id} onClick={() => toggle(id)}>
                      {pickedTitles[id] ?? `#${id}`} <i className="fas fa-xmark" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {(mode === "categories" || mode === "tags") && (
            <div className="bu-chipgrid">
              {(mode === "categories" ? sources.categories : sources.tags).map((c) => (
                <button type="button" key={c.id} className={picked.has(c.id) ? "on" : ""} onClick={() => toggle(c.id)}>
                  {picked.has(c.id) && <i className="fas fa-check" />} {c.name} <em>{c.count}</em>
                </button>
              ))}
              {(mode === "categories" ? sources.categories : sources.tags).length > 1 && (
                <button
                  type="button"
                  className="bu-selall"
                  onClick={() => setPicked(new Set((mode === "categories" ? sources.categories : sources.tags).map((c) => c.id)))}
                >
                  Select all
                </button>
              )}
            </div>
          )}
          {mode === "all" && <p className="bu-note">Every published post will get new dates.</p>}
          {mode === "pages" && (
            <div className="bu-pick">
              <label className="bu-radio">
                <input type="radio" checked={allPages} onChange={() => setAllPages(true)} /> All pages
              </label>
              <label className="bu-radio">
                <input type="radio" checked={!allPages} onChange={() => setAllPages(false)} /> Choose pages
              </label>
              {!allPages && (
                <div className="bu-list">
                  {sources.pages.map((p) => (
                    <label key={p.id} className={picked.has(p.id) ? "on" : ""}>
                      <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id, p.title)} />
                      <span>{p.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {error && <p className="bu-err">{error}</p>}
          <div className="bu-actions">
            <span />
            <button type="button" className="bu-btn" disabled={!canNext || loadingPreview} onClick={toStep2}>
              {loadingPreview ? "Loading…" : "Next"} <i className="fas fa-arrow-right" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && items && (
        <div className="bu-grid">
          <div className="bu-card">
            <h3>When should they show as published?</h3>
            <div className="bu-field">
              <span>Time gap between items</span>
              <div className="bu-gaps">
                {GAPS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    className={!useCustom && gap === g ? "active" : ""}
                    onClick={() => {
                      setUseCustom(false);
                      setGap(g);
                    }}
                  >
                    {g === 0 ? "Same time" : `${g} min`}
                  </button>
                ))}
                <button type="button" className={useCustom ? "active" : ""} onClick={() => setUseCustom(true)}>
                  Custom
                </button>
              </div>
              {useCustom && (
                <label className="bu-inline">
                  <input className="bu-input" type="number" min={0} max={1440} value={customGap} onChange={(e) => setCustomGap(Number(e.target.value))} /> minutes
                </label>
              )}
            </div>
            <div className="bu-field">
              <span>Start from</span>
              <label className="bu-radio">
                <input type="radio" checked={startMode === "now"} onChange={() => setStartMode("now")} /> Now
              </label>
              <label className="bu-radio">
                <input type="radio" checked={startMode === "custom"} onChange={() => setStartMode("custom")} /> A specific time
              </label>
              {startMode === "custom" && <input className="bu-input" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />}
            </div>
            <div className="bu-field">
              <span>Order</span>
              <label className="bu-radio">
                <input type="radio" checked={order === "keep"} onChange={() => setOrder("keep")} /> Keep the current order (newest stays on top)
              </label>
              <label className="bu-radio">
                <input type="radio" checked={order === "shuffle"} onChange={() => setOrder("shuffle")} /> Shuffle
              </label>
            </div>
            <div className="bu-seo">
              <i className="fas fa-magnifying-glass-chart" />
              <div>
                <strong>SEO refresh included</strong>
                Published date, modified date, article schema, Open Graph times, RSS feed, sitemaps and the Google News sitemap all show the new dates. Search engines are notified
                (IndexNow) as soon as the update finishes.
              </div>
            </div>
            <div className="bu-actions">
              <button type="button" className="bu-btn-light" onClick={() => setStep(1)}>
                <i className="fas fa-arrow-left" /> Back
              </button>
              <button type="button" className="bu-btn" onClick={run} disabled={startMode === "custom" && !startAt}>
                <i className="fas fa-bolt" /> Update {count.toLocaleString("en-IN")} {count === 1 ? "item" : "items"}
              </button>
            </div>
          </div>
          <div className="bu-card">
            <h3>
              Preview <em>{count.toLocaleString("en-IN")}</em>
            </h3>
            <div className="bu-preview">
              {schedule.slice(0, 60).map((s) => (
                <div key={`${s.type}${s.id}`}>
                  <span>{s.title}</span>
                  <em>
                    {s.date ? <s>{fmt(s.date)}</s> : null} <i className="fas fa-arrow-right" /> <b>{fmt(s.at)}</b>
                  </em>
                </div>
              ))}
              {schedule.length > 60 && <p className="bu-note">…and {schedule.length - 60} more</p>}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bu-card bu-run">
          <div className={`bu-ring${finished ? " done" : ""}`} style={{ "--p": pct } as React.CSSProperties}>
            <span>{finished ? <i className="fas fa-check" /> : `${pct}%`}</span>
          </div>
          <h3>{finished ? "All done!" : running ? "Updating…" : error ? "Stopped" : "Ready"}</h3>
          <p className="bu-count">
            {done.length.toLocaleString("en-IN")} of {count.toLocaleString("en-IN")} updated
            {finished && ` · ${finished.pinged.toLocaleString("en-IN")} URLs sent to search engines`}
          </p>
          <div className="bu-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          {error && <p className="bu-err">{error}</p>}
          <div className="bu-log" ref={logRef}>
            {done.map((r, i) => (
              <div key={`${r.type}${r.id}`} className="bu-log-row" style={{ animationDelay: `${Math.min(i % 10, 9) * 40}ms` }}>
                <i className="fas fa-circle-check" />
                <span>{r.title}</span>
                <em>{fmt(r.at)}</em>
              </div>
            ))}
          </div>
          {!running && (
            <div className="bu-actions">
              <span />
              <button type="button" className="bu-btn" onClick={reset}>
                <i className="fas fa-rotate" /> Update more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
