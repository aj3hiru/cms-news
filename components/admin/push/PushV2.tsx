"use client";

import { useEffect, useMemo, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend, ArcElement } from "chart.js";
import { Chart, Doughnut } from "react-chartjs-2";
import {
  deletePushSegment,
  estimatePushSegment,
  getPushAnalytics,
  listPushSegments,
  pushFieldValues,
  savePushSegment,
  type PushAnalytics,
  type SegmentRow,
} from "@/lib/push/admin";
import { SEGMENT_FIELDS, type SegmentField, type SegmentRule } from "@/lib/push/segments";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend, ArcElement);

const COLORS = ["#7c3aed", "#0ea5e9", "#16a34a", "#f59e0b", "#ef4444", "#14b8a6", "#ec4899", "#64748b", "#a3e635", "#f97316"];
const LABELS: Record<string, string> = { mobile: "Mobile", desktop: "Desktop" };

function countryName(code: string): string {
  if (!code) return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/* ───────── Analytics (LaraPush-style) ───────── */
export function PushAnalyticsTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PushAnalytics | null>(null);
  useEffect(() => {
    let live = true;
    getPushAnalytics(days).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [days]);
  if (!data) return <div className="pn-card pn-muted">Loading analytics…</div>;
  const g = data.growth;
  return (
    <>
      <div className="pn-card">
        <div className="pn-head">
          <h3>
            <i className="fas fa-chart-line" /> Subscriber growth
          </h3>
          <div className="pn-seg-days">
            {[7, 30, 90, 365].map((d) => (
              <button type="button" key={d} className={days === d ? "on" : ""} onClick={() => setDays(d)}>
                {d === 365 ? "1 year" : `${d} days`}
              </button>
            ))}
          </div>
        </div>
        <div className="pn-growth">
          <Chart
            type="bar"
            data={{
              labels: g.map((x) => new Date(`${x.d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })),
              datasets: [
                { type: "line" as const, label: "Total subscribers", data: g.map((x) => x.total), borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,.08)", fill: true, tension: 0.3, pointRadius: 0, yAxisID: "y" },
                { type: "bar" as const, label: "New", data: g.map((x) => x.added), backgroundColor: "#22c55e", borderRadius: 4, yAxisID: "y1" },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "index", intersect: false },
              plugins: { legend: { position: "bottom" } },
              scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
                y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Total" } },
                y1: { beginAtZero: true, position: "right", grid: { display: false }, ticks: { precision: 0 }, title: { display: true, text: "New" } },
              },
            }}
          />
        </div>
      </div>
      <div className="pn-an-grid">
        {(
          [
            ["device", "fa-display", "Desktop vs Mobile"],
            ["os", "fa-mobile-screen", "Platform (Android / iOS / Desktop)"],
            ["browser", "fa-globe", "Browser"],
          ] as const
        ).map(([k, icon, title]) => {
          const rows = data[k].map(([l, v], i) => ({ l: LABELS[l] ?? l, v, c: COLORS[i % COLORS.length] }));
          return (
            <div className="pn-card" key={k}>
              <h3>
                <i className={`fas ${icon}`} /> {title}
              </h3>
              {!rows.length ? (
                <p className="pn-muted">No subscribers yet.</p>
              ) : (
                <>
                  <div className="pn-donut">
                    <Doughnut
                      data={{ labels: rows.map((r) => r.l), datasets: [{ data: rows.map((r) => r.v), backgroundColor: rows.map((r) => r.c), borderWidth: 0 }] }}
                      options={{ responsive: true, maintainAspectRatio: false, cutout: "64%", plugins: { legend: { display: false } } }}
                    />
                  </div>
                  <ul className="pn-legend">
                    {rows.map((r) => (
                      <li key={r.l}>
                        <i style={{ background: r.c }} />
                        <span>{r.l}</span>
                        <b>{r.v.toLocaleString("en-IN")}</b>
                        <small>{data.total ? Math.round((r.v / data.total) * 1000) / 10 : 0}%</small>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="pn-an-2">
        <div className="pn-card">
          <h3>
            <i className="fas fa-earth-asia" /> Countries
          </h3>
          {!data.countries.length ? (
            <p className="pn-muted">No subscribers yet.</p>
          ) : (
            <div className="pn-scroll">
              <table className="pn-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th className="num">Desktop</th>
                    <th className="num">Mobile</th>
                    <th className="num">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.countries.map((c) => (
                    <tr key={c.code || "unknown"}>
                      <td>
                        {countryName(c.code)} {c.code && <small className="pn-muted">{c.code}</small>}
                      </td>
                      <td className="num">{c.desktop.toLocaleString("en-IN")}</td>
                      <td className="num">{c.mobile.toLocaleString("en-IN")}</td>
                      <td className="num">
                        <b>{c.total.toLocaleString("en-IN")}</b>
                      </td>
                      <td>
                        <div className="pn-bar">
                          <span style={{ width: `${data.total ? (c.total / data.total) * 100 : 0}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="pn-card">
          <h3>
            <i className="fas fa-map-location-dot" /> States / Regions
          </h3>
          {!data.regions.length ? (
            <div className="pn-note">
              <b>State data is collected from new visits.</b> Cloudflare only sends the visitor&apos;s state when <b>“Add visitor location headers”</b> is on: Cloudflare dashboard → your
              domain → Rules → Transform Rules → <b>Managed Transforms</b> → turn on “Add visitor location headers” (free). Subscribers then get their state the next time they visit.
            </div>
          ) : (
            <div className="pn-scroll">
              <table className="pn-table">
                <thead>
                  <tr>
                    <th>State</th>
                    <th>Country</th>
                    <th className="num">Desktop</th>
                    <th className="num">Mobile</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.regions.map((r) => (
                    <tr key={`${r.country}-${r.region}`}>
                      <td>{r.region}</td>
                      <td>{r.country || "—"}</td>
                      <td className="num">{r.desktop.toLocaleString("en-IN")}</td>
                      <td className="num">{r.mobile.toLocaleString("en-IN")}</td>
                      <td className="num">
                        <b>{r.total.toLocaleString("en-IN")}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ───────── Segments ───────── */
type Draft = { field: SegmentField; op: "is" | "is_not"; values: string };
const toDraft = (r: SegmentRule): Draft => ({ field: r.field, op: r.op, values: r.values.join(", ") });
const fromDraft = (d: Draft[]) => d.map((r) => ({ field: r.field, op: r.op, values: r.values.split(",").map((v) => v.trim()).filter(Boolean) })).filter((r) => r.values.length);

export function PushSegmentsTab({ onChanged, onSendTo }: { onChanged: () => void; onSendTo: (id: number) => void }) {
  const [list, setList] = useState<SegmentRow[] | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [rules, setRules] = useState<Draft[]>([{ field: "country", op: "is", values: "" }]);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [values, setValues] = useState<Record<string, string[]>>({});
  const load = () => listPushSegments().then(setList);
  useEffect(() => {
    void load();
  }, []);
  const fields = useMemo(() => [...new Set(rules.map((r) => r.field))], [rules]);
  useEffect(() => {
    for (const f of fields) if (!values[f]) pushFieldValues(f).then((v) => setValues((x) => ({ ...x, [f]: v })));
  }, [fields, values]);

  function reset() {
    setEditing(null);
    setName("");
    setRules([{ field: "country", op: "is", values: "" }]);
    setEstimate(null);
    setMsg(null);
  }
  const set = (i: number, patch: Partial<Draft>) => {
    setRules((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setEstimate(null);
  };

  return (
    <div className="pn-settings">
      <div className="pn-card">
        <h3>
          <i className="fas fa-layer-group" /> Segments
        </h3>
        {!list ? (
          <p className="pn-muted">Loading…</p>
        ) : !list.length ? (
          <p className="pn-muted">No segments yet. A segment is a group of subscribers, for example “India · Mobile”. New subscribers who match join it automatically.</p>
        ) : (
          <table className="pn-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Subscribers</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <br />
                    <small className="pn-muted">{s.text}</small>
                  </td>
                  <td className="num">
                    <b>{s.count.toLocaleString("en-IN")}</b>
                  </td>
                  <td className="num pn-nowrap">
                    <button
                      type="button"
                      className="pn-btn-light"
                      title="Edit"
                      onClick={() => {
                        setEditing(s.id);
                        setName(s.name);
                        setRules(s.rules.map(toDraft));
                        setEstimate(null);
                      }}
                    >
                      <i className="fas fa-pen" />
                    </button>{" "}
                    <button type="button" className="pn-btn-light" title="Send to this segment" onClick={() => onSendTo(s.id)}>
                      <i className="fas fa-paper-plane" />
                    </button>{" "}
                    <button
                      type="button"
                      className="pn-icon"
                      title="Delete"
                      onClick={async () => {
                        if (!confirm("Delete this segment? Its subscribers are not removed.")) return;
                        await deletePushSegment(s.id);
                        await load();
                        onChanged();
                      }}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="pn-card">
        <h3>
          <i className="fas fa-plus" /> {editing ? "Edit segment" : "New segment"}
        </h3>
        <label className="pn-field">
          Segment name
          <input className="pn-input" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. India · Mobile" />
        </label>
        <div className="pn-field">
          Conditions <em>all must match</em>
        </div>
        {rules.map((r, i) => (
          <div className="pn-rule" key={i}>
            <select className="pn-input" value={r.field} onChange={(e) => set(i, { field: e.target.value as SegmentField, values: "" })}>
              {Object.entries(SEGMENT_FIELDS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <select className="pn-input" value={r.op} onChange={(e) => set(i, { op: e.target.value as "is" | "is_not" })}>
              <option value="is">is</option>
              <option value="is_not">is not</option>
            </select>
            <input className="pn-input" value={r.values} placeholder="Values, comma separated" onChange={(e) => set(i, { values: e.target.value })} />
            <button type="button" className="pn-icon" title="Remove" onClick={() => setRules((x) => x.filter((_, j) => j !== i))}>
              <i className="fas fa-xmark" />
            </button>
            <div className="pn-chips">
              {[...(r.field === "device" ? ["mobile", "desktop"] : (values[r.field] ?? []).slice(0, 40)), "Unknown"].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => {
                    const cur = r.values.split(",").map((x) => x.trim()).filter(Boolean);
                    if (!cur.includes(v)) set(i, { values: [...cur, v].join(", ") });
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" className="pn-btn-light" onClick={() => setRules((x) => [...x, { field: "country", op: "is", values: "" }])}>
          <i className="fas fa-plus" /> Add condition
        </button>
        <p className="pn-muted">Separate several values with commas (any of them matches). Use “Unknown” for subscribers without that detail.</p>
        <div className="pn-actions">
          <button
            type="button"
            className="pn-btn-light"
            onClick={async () => {
              const r = fromDraft(rules);
              if (!r.length) return setMsg({ ok: false, text: "Add a condition with at least one value." });
              setMsg(null);
              setEstimate(await estimatePushSegment(r));
            }}
          >
            <i className="fas fa-calculator" /> Calculate estimate
          </button>
          {estimate !== null && (
            <span className="pn-est">
              <i className="fas fa-users" /> {estimate.toLocaleString("en-IN")} subscriber{estimate === 1 ? "" : "s"} match right now
            </span>
          )}
        </div>
        <div className="pn-actions" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="pn-btn"
            onClick={async () => {
              const r = await savePushSegment(editing, name, fromDraft(rules));
              if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Could not save." });
              reset();
              await load();
              onChanged();
              setMsg({ ok: true, text: "Segment saved." });
            }}
          >
            <i className="fas fa-floppy-disk" /> Save segment
          </button>
          {editing && (
            <button type="button" className="pn-btn-light" onClick={reset}>
              Cancel editing
            </button>
          )}
        </div>
        {msg && <p className={msg.ok ? "pn-ok" : "pn-err"}>{msg.text}</p>}
      </div>
    </div>
  );
}
