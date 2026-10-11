"use client";

import { useState } from "react";
import Link from "next/link";
import { saveSeoSettings } from "@/lib/seo/actions";
import type { SeoSettings } from "@/lib/seo/settings";
import { SEO_MODULES } from "@/lib/seo/screens";
import { RmSwitch, RmTop } from "./RmUi";

/** SEO → Dashboard: Rank Math's module cards. A toggle saves at once. */
export function RmDashboard({ initial }: { initial: SeoSettings }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function toggle(k: keyof SeoSettings, v: boolean) {
    setBusy(k);
    setErr("");
    setS((x) => ({ ...x, [k]: v }));
    const r = await saveSeoSettings({ [k]: v } as Partial<SeoSettings>);
    if (!r.ok) {
      setS((x) => ({ ...x, [k]: !v }));
      setErr(r.error ?? "Could not save.");
    }
    setBusy(null);
  }

  async function level(l: "easy" | "advanced") {
    setS((x) => ({ ...x, wizard_level: l }));
    await saveSeoSettings({ wizard_level: l });
  }

  return (
    <div className="rm">
      <RmTop view="dashboard" level={s.wizard_level} onLevel={level} />
      <div className="rm-tabs-h">
        <Link href="/admin/seo" className="on">
          Modules
        </Link>
        <Link href="/admin/seo/wizard">Setup Wizard</Link>
        <Link href="/admin/seo/status?tab=importexport">Import &amp; Export</Link>
      </div>
      {!s.configured && (
        <div className="rm-warn">
          The setup wizard has not been completed yet. <Link href="/admin/seo/wizard">Start the Setup Wizard</Link> — it takes about a minute and sets the most important options.
        </div>
      )}
      {s.noindex_site && (
        <div className="rm-warn bad">
          <b>Search engines are discouraged</b> from indexing this site (Titles &amp; Meta → Global Meta). <Link href="/admin/seo/titles?tab=global">Change it</Link>
        </div>
      )}
      {err && <div className="rm-warn bad">{err}</div>}
      <div className="rm-modules">
        {SEO_MODULES.map((m) => {
          const on = Boolean(s[m.k]);
          return (
            <div key={m.k} className={`rm-mod${on ? "" : " off"}`}>
              <div className="rm-mod-body">
                <div className="rm-mod-ic" style={{ color: m.color, background: m.bg }}>
                  <i className={`fas ${m.icon}`} />
                </div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
              <div className="rm-mod-foot">
                {m.href ? (
                  <Link className="rm-btn" href={m.href}>
                    Settings
                  </Link>
                ) : (
                  <span />
                )}
                <RmSwitch checked={on} disabled={busy === m.k} onChange={(v) => toggle(m.k, v)} label={`${m.title} module`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
