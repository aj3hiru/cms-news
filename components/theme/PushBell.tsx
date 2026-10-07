"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

type State = "loading" | "unsupported" | "off" | "default" | "denied" | "subscribed";

const K_KEY = "push_vapid_key";
const K_SYNC = "push_last_sync";
const K_PROMPTED = "push_prompted_at";
const REPROMPT_MS = 3 * 24 * 60 * 60 * 1000;
const SYNC_MS = 24 * 60 * 60 * 1000;

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

function b64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const padded = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function subscribeBrowser(reg: ServiceWorkerRegistration, publicKey: string): Promise<boolean> {
  let sub = await reg.pushManager.getSubscription();
  if (sub && store.get(K_KEY) !== publicKey) {
    // Made with an old key — replace it.
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub)
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToBytes(publicKey),
    });
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  }).catch(() => null);
  if (!res?.ok) return false;
  store.set(K_KEY, publicKey);
  store.set(K_SYNC, String(Date.now()));
  return true;
}

/** Chromium can show the permission prompt without a tap; Firefox and Safari need one. */
function canPromptWithoutGesture(): boolean {
  const brands = (navigator as unknown as { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  return Boolean(brands?.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand)));
}

/**
 * Header bell for push notifications (same flow as sriandaltraders.co.in):
 * visible only while the reader isn't subscribed, hidden after subscribing.
 * First visit: the browser's own Allow/Block prompt (Chrome after a short
 * delay, Firefox/Safari on the first tap); not asked again for 3 days.
 */
const GUIDE_IMG = "/push-allow.webp";
const PUSH_EN = {
  get: "Get notifications",
  enabled: "Notifications enabled!",
  blocked: "Notifications are blocked",
  help: "Tap the 🔒 icon next to the web address, allow Notifications, then reload the page.",
};

export function PushBell({ className = "", label, labels = PUSH_EN, ready = false }: { className?: string; label?: string; labels?: typeof PUSH_EN; ready?: boolean }) {
  // `ready`: push is set up on the server, so the bell is drawn with the page (no pop-in).
  const [state, setState] = useState<State>(ready ? "default" : "loading");
  const [showBell, setShowBell] = useState(true);
  const [toast, setToast] = useState(false);
  const [help, setHelp] = useState(false);
  // Trial: the guide alternates picture / CSS version on each opening (count kept for the browser session).
  const [guide, setGuide] = useState<"img" | "css">("img");
  const ctx = useRef<{ reg: ServiceWorkerRegistration; key: string } | null>(null);
  const busy = useRef(false);

  const subscribe = useCallback(async () => {
    if (busy.current || !("Notification" in window)) return;
    busy.current = true;
    try {
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      store.set(K_PROMPTED, String(Date.now()));
      if (perm === "denied") return setState("denied");
      if (perm !== "granted" || !ctx.current) return setState("default");
      await navigator.serviceWorker.ready;
      if (await subscribeBrowser(ctx.current.reg, ctx.current.key)) {
        setState("subscribed");
        document.documentElement.classList.add("nb-push-sub");
        setToast(true);
        setTimeout(() => setToast(false), 3000);
      } else setState("default");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "default");
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time browser capability check
      setState("unsupported");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let removeGesture: (() => void) | null = null;
    (async () => {
      const data = await fetch("/api/push/subscribe")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (cancelled) return;
      if (!data?.publicKey) return setState("off");
      setShowBell(data.showBell !== false);
      const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (!reg || cancelled) return setState("unsupported");
      ctx.current = { reg, key: data.publicKey };
      if (Notification.permission === "denied") return setState("denied");
      if (Notification.permission === "granted") {
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const fresh = existing && store.get(K_KEY) === data.publicKey && Date.now() - Number(store.get(K_SYNC) ?? 0) < SYNC_MS;
        const ok = fresh || (await subscribeBrowser(reg, data.publicKey).catch(() => false));
        if (!cancelled) setState(ok ? "subscribed" : "default");
        if (ok) document.documentElement.classList.add("nb-push-sub");
        return;
      }
      setState("default");
      if (!data.autoPrompt || Date.now() - Number(store.get(K_PROMPTED) ?? 0) < REPROMPT_MS) return;
      if (canPromptWithoutGesture()) {
        timer = setTimeout(() => !cancelled && void subscribe(), Math.max(1, Number(data.promptDelay) || 3) * 1000);
      } else {
        const onFirst = () => {
          removeGesture?.();
          void subscribe();
        };
        document.addEventListener("pointerdown", onFirst, {
          once: true,
          capture: true,
        });
        removeGesture = () =>
          document.removeEventListener("pointerdown", onFirst, {
            capture: true,
          });
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      removeGesture?.();
    };
  }, [subscribe]);

  // Blocked: fetch the guide picture now, so it appears instantly when the bell is tapped.
  useEffect(() => {
    if (state !== "denied") return;
    const img = new Image();
    img.src = GUIDE_IMG;
    img.decode?.().catch(() => {});
  }, [state]);

  const toggleHelp = () => {
    if (help) return setHelp(false);
    let n = 0;
    try {
      n = Number(sessionStorage.getItem("nb_guide_n") || 0);
      sessionStorage.setItem("nb_guide_n", String(n + 1));
    } catch {}
    setGuide(n % 2 === 0 ? "img" : "css");
    setHelp(true);
  };

  const visible = showBell && (state === "default" || state === "denied");
  return (
    <>
      {visible && (
        <span className={`nb-bell-wrap ${className}`}>
          <button
            type="button"
            className={`nb-bell${state === "denied" ? " is-denied" : ""}`}
            onClick={() => (state === "denied" ? toggleHelp() : void subscribe())}
            aria-label={state === "denied" ? labels.blocked : labels.get}
            title={state === "denied" ? labels.blocked : labels.get}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.268 21a2 2 0 0 0 3.464 0" />
              <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
              {state === "denied" && <path d="m2 2 20 20" />}
            </svg>
            {state !== "denied" && <span className="nb-bell-dot" aria-hidden="true" />}
            {label && <span className="nb-bell-label">{label}</span>}
          </button>
        </span>
      )}
      {help &&
        // Picture guide pointing at the 🔒 next to the address bar (public/push-allow.webp, ~10 KB, fetched in advance).
        // Portal to <body>: inside the header it would sit under the header's own stacking layer.
        createPortal(
          <div className="nb-allow-guide" role="dialog" aria-label={labels.blocked} onClick={() => setHelp(false)}>
            <div className="nb-allow-card">
              <button type="button" className="nb-allow-close" onClick={() => setHelp(false)} aria-label="Close">
                ×
              </button>
              {guide === "img" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={GUIDE_IMG} width={640} height={358} alt={`${labels.blocked}. ${labels.help}`} decoding="sync" fetchPriority="high" />
              ) : (
                <CssGuide label={`${labels.blocked}. ${labels.help}`} />
              )}
            </div>
          </div>,
          document.body,
        )}
      {toast && (
        <div className="nb-push-toast" role="status">
          ✓ {labels.enabled}
        </div>
      )}
    </>
  );
}

/** Same guide as public/push-allow.webp, drawn with HTML + CSS (text) and inline SVG (arrows, ring). Scales with its box. */
function CssGuide({ label }: { label: string }) {
  return (
    <div className="nb-ag" role="img" aria-label={label}>
      <svg className="nb-ag-svg" viewBox="0 0 1280 716" aria-hidden="true">
        <path className="nb-ag-arrow" d="M568 232C330 270 168 235 180 42" />
        <path className="nb-ag-arrow" d="M138 88 180 34 228 84" />
        <circle className="nb-ag-ring" cx="181" cy="377" r="92" />
        <path className="nb-ag-arrow nb-ag-arrow--sm" d="M322 606C215 615 140 575 146 500" />
        <path className="nb-ag-arrow nb-ag-arrow--sm" d="M118 528 146 492 176 524" />
      </svg>
      <span className="nb-ag-look">Look here</span>
      <span className="nb-ag-lockhint">
        <i>🔒</i> lock icon
      </span>
      <span className="nb-ag-bar">
        <i>🔒</i>
        <span>Your website address</span>
      </span>
      <span className="nb-ag-tip">
        <b>Tap here to allow notifications</b>
        <small>Tap the 🔒 lock icon → Notifications → Allow</small>
      </span>
    </div>
  );
}
