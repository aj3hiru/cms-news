"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONSENT_COOKIE, STRICT_REGIONS } from "./consentBoot";

export interface ConsentLabels {
  title: string;
  message: string;
  accept: string;
  reject: string;
  customize: string;
  save: string;
  privacy: string;
  necessary: string;
  necessaryDesc: string;
  analytics: string;
  analyticsDesc: string;
  ads: string;
  adsDesc: string;
  personal: string;
  personalDesc: string;
  alwaysOn: string;
  close: string;
}

export interface ConsentConfig {
  showTo: "all" | "outside_eea" | "eea_only";
  optInEverywhere: boolean;
  position: "bottom" | "bottom-left" | "center" | "bar";
  days: number;
  privacyUrl: string;
  labels: ConsentLabels;
}

interface Choice {
  analytics: boolean;
  ads: boolean;
  personal: boolean;
}

type Gtag = (...args: unknown[]) => void;
type AdsQueue = unknown[] & { pauseAdRequests?: number; requestNonPersonalizedAds?: number };
declare global {
  interface Window {
    gtag?: Gtag;
    adsbygoogle?: AdsQueue;
    nbConsent?: { open: () => void; get: () => Choice | null };
  }
}

function readChoice(): Choice | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`));
  const v = m ? decodeURIComponent(m[1]).split(".") : null;
  if (!v || v[0] !== "1") return null;
  return { analytics: v[1] === "1", ads: v[2] === "1", personal: v[2] === "1" && v[3] === "1" };
}

/** Country from Cloudflare (via /api/geo), remembered for the browser session. */
async function getCountry(): Promise<string> {
  try {
    const saved = sessionStorage.getItem("nb_cc");
    if (saved) return saved;
  } catch {}
  try {
    const r = await fetch("/api/geo", { cache: "no-store" });
    const c = ((await r.json()) as { c?: string }).c || "XX";
    try {
      sessionStorage.setItem("nb_cc", c);
    } catch {}
    return c;
  } catch {
    return "XX";
  }
}

const g = (b: boolean) => (b ? "granted" : "denied");

/** Tells Google tags and AdSense what the visitor allowed. */
function applyChoice(c: Choice | null, strict: boolean) {
  const q = (window.adsbygoogle = window.adsbygoogle || ([] as unknown as AdsQueue));
  if (c) {
    window.gtag?.("consent", "update", {
      analytics_storage: g(c.analytics),
      ad_storage: g(c.ads),
      ad_user_data: g(c.ads),
      ad_personalization: g(c.ads && c.personal),
    });
    q.requestNonPersonalizedAds = c.ads && c.personal ? 0 : 1;
    // Where consent is required, no ads at all without permission for ad cookies.
    q.pauseAdRequests = !c.ads && strict ? 1 : 0;
  } else {
    q.pauseAdRequests = strict ? 1 : 0;
  }
  window.dispatchEvent(new CustomEvent("nb-consent", { detail: c }));
}

/** Cookie banner like the reference (title, text, Customize / Reject All / Accept All) with a preferences view. */
export function CookieBanner({ cfg }: { cfg: ConsentConfig }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "prefs">("main");
  const [prefs, setPrefs] = useState<Choice>({ analytics: false, ads: false, personal: false });
  const strictRef = useRef(true);
  const previewRef = useRef(false);
  const L = cfg.labels;

  const openPrefs = useCallback(() => {
    setPrefs(readChoice() ?? { analytics: false, ads: false, personal: false });
    setView("prefs");
    setOpen(true);
  }, []);

  useEffect(() => {
    const preview = document.documentElement.classList.contains("nb-in-customizer");
    previewRef.current = preview;
    window.nbConsent = { open: openPrefs, get: readChoice };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-nb-consent], a[href="#cookie-settings"]');
      if (!el) return;
      e.preventDefault();
      openPrefs();
    };
    document.addEventListener("click", onClick);

    let alive = true;
    (async () => {
      const cc = preview ? "XX" : await getCountry();
      if (!alive) return;
      const inStrict = STRICT_REGIONS.includes(cc);
      strictRef.current = cfg.optInEverywhere || inStrict;
      const targeted = cfg.showTo === "all" || (cfg.showTo === "eea_only" ? inStrict : !inStrict);
      const saved = readChoice();
      if (preview) {
        setView("main");
        setOpen(true);
        return;
      }
      if (!targeted) {
        // Not shown here (e.g. Google's own consent message handles EEA/UK/CH): let ads run under that system.
        applyChoice(saved, false);
        return;
      }
      applyChoice(saved, strictRef.current);
      if (!saved) setOpen(true);
    })();
    return () => {
      alive = false;
      document.removeEventListener("click", onClick);
    };
  }, [cfg.optInEverywhere, cfg.showTo, openPrefs]);

  const decide = (c: Choice) => {
    setOpen(false);
    setView("main");
    if (previewRef.current) return;
    const days = Math.max(1, Math.min(395, cfg.days || 180));
    const value = ["1", c.analytics ? 1 : 0, c.ads ? 1 : 0, c.ads && c.personal ? 1 : 0, Math.floor(Date.now() / 1000)].join(".");
    document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    applyChoice(c, strictRef.current);
  };
  const all = { analytics: true, ads: true, personal: true };
  const none = { analytics: false, ads: false, personal: false };

  if (!open) return null;
  const row = (title: string, desc: string, k?: keyof Choice) => (
    <div className="nbc-row" key={title}>
      <div className="nbc-row-text">
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
      {k ? (
        <label className="nbc-switch">
          <input
            type="checkbox"
            checked={prefs[k]}
            disabled={k === "personal" && !prefs.ads}
            onChange={(e) => setPrefs((p) => ({ ...p, [k]: e.target.checked, ...(k === "ads" && !e.target.checked ? { personal: false } : {}) }))}
          />
          <span aria-hidden="true" />
          <em className="screen-reader-text">{title}</em>
        </label>
      ) : (
        <span className="nbc-always">{L.alwaysOn}</span>
      )}
    </div>
  );

  return (
    <div className={`nbc nbc--${cfg.position}`} data-nosnippet="">
      {cfg.position === "center" && <div className="nbc-backdrop" />}
      <div className="nbc-card" role="dialog" aria-modal={cfg.position === "center"} aria-labelledby="nbc-title">
        <h2 id="nbc-title" className="nbc-title">
          {view === "prefs" ? L.customize : L.title}
        </h2>
        {view === "main" ? (
          <p className="nbc-text">
            {L.message}
            {cfg.privacyUrl && (
              <>
                {" "}
                <a href={cfg.privacyUrl}>{L.privacy}</a>
              </>
            )}
          </p>
        ) : (
          <div className="nbc-prefs">
            {row(L.necessary, L.necessaryDesc)}
            {row(L.analytics, L.analyticsDesc, "analytics")}
            {row(L.ads, L.adsDesc, "ads")}
            {row(L.personal, L.personalDesc, "personal")}
          </div>
        )}
        <div className="nbc-btns">
          {view === "main" ? (
            <button type="button" className="nbc-btn nbc-btn--line" onClick={openPrefs}>
              {L.customize}
            </button>
          ) : (
            <button type="button" className="nbc-btn nbc-btn--line" onClick={() => decide(prefs)}>
              {L.save}
            </button>
          )}
          <button type="button" className="nbc-btn nbc-btn--line" onClick={() => decide(none)}>
            {L.reject}
          </button>
          <button type="button" className="nbc-btn nbc-btn--fill" onClick={() => decide(all)}>
            {L.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
