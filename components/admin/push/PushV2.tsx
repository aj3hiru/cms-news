"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend, ArcElement } from "chart.js";
import { Chart, Doughnut } from "react-chartjs-2";
import { getPushAnalytics, type PushAnalytics } from "@/lib/push/admin";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend, ArcElement);

const PLATFORM_COLORS: Record<string, string> = { Android: "#16a34a", "iOS (iPhone / iPad)": "#0ea5e9", Desktop: "#7c3aed", Other: "#cbd5e1" };

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
  if (!data) return <div className="pn-card pn-muted">Loading reports…</div>;
  const g = data.growth;
  const known = data.countries.filter((c) => c.code);
  const unknownC = data.total - known.reduce((t, c) => t + c.total, 0);
  const pct = (n: number) => (data.total ? Math.round((n / data.total) * 1000) / 10 : 0);
  return (
    <>
      <div className="px-rep">
        <div className="pn-card">
          <div className="pn-head">
            <div>
              <h3>Total subscribers</h3>
              <div className="px-big">{data.total.toLocaleString("en-IN")}</div>
            </div>
            <div className="px-ranges">
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
                plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
                scales: {
                  x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
                  y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#f1f5f9" } },
                  y1: { beginAtZero: true, position: "right", grid: { display: false }, ticks: { precision: 0 } },
                },
              }}
            />
          </div>
        </div>
        <div className="pn-card">
          <h3>Devices</h3>
          <p className="px-sub">Android, iPhone / iPad and desktop</p>
          {!data.platform.length ? (
            <p className="pn-muted">No subscribers yet.</p>
          ) : (
            <>
              <div className="px-donut">
                <Doughnut
                  data={{ labels: data.platform.map(([l]) => l), datasets: [{ data: data.platform.map(([, v]) => v), backgroundColor: data.platform.map(([l]) => PLATFORM_COLORS[l] ?? "#94a3b8"), borderWidth: 0 }] }}
                  options={{ responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } }}
                />
              </div>
              <ul className="px-legend">
                {data.platform.map(([l, v]) => (
                  <li key={l}>
                    <i style={{ background: PLATFORM_COLORS[l] ?? "#94a3b8" }} />
                    <span>{l}</span>
                    <b>{v.toLocaleString("en-IN")}</b>
                    <small>{pct(v)}%</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="pn-card px-gap">
        <h3>Subscribers by country</h3>
        <p className="px-sub">
          Only countries where you have subscribers{unknownC > 0 ? ` · ${unknownC.toLocaleString("en-IN")} without a known country` : ""}
        </p>
        {!known.length ? (
          <p className="pn-muted">No country known yet — it is saved when a reader subscribes (through Cloudflare).</p>
        ) : (
          <div className="pn-scroll">
            <table className="pn-table px-ctry">
              <thead>
                <tr>
                  <th>Country</th>
                  <th className="num">Subscribers</th>
                  <th className="num">Share</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {known.map((c) => (
                  <tr key={c.code}>
                    <td>
                      {countryName(c.code)} <small className="pn-muted">{c.code}</small>
                    </td>
                    <td className="num">
                      <b>{c.total.toLocaleString("en-IN")}</b>
                    </td>
                    <td className="num">{pct(c.total)}%</td>
                    <td style={{ width: "35%" }}>
                      <span className="px-bb">
                        <i style={{ width: `${pct(c.total)}%` }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
