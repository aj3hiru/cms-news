"use client";

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
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) }).catch(() => null);
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
const PUSH_EN = { get: "Get notifications", enabled: "Notifications enabled!", blocked: "Notifications are blocked", help: "Tap the 🔒 icon next to the web address, allow Notifications, then reload the page." };

export function PushBell({ className = "", label, labels = PUSH_EN, ready = false }: { className?: string; label?: string; labels?: typeof PUSH_EN; ready?: boolean }) {
  // `ready`: push is set up on the server, so the bell is drawn with the page (no pop-in).
  const [state, setState] = useState<State>(ready ? "default" : "loading");
  const [showBell, setShowBell] = useState(true);
  const [toast, setToast] = useState(false);
  const [help, setHelp] = useState(false);
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
        document.addEventListener("pointerdown", onFirst, { once: true, capture: true });
        removeGesture = () => document.removeEventListener("pointerdown", onFirst, { capture: true });
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      removeGesture?.();
    };
  }, [subscribe]);

  const visible = showBell && (state === "default" || state === "denied");
  return (
    <>
      {visible && (
        <span className={`nb-bell-wrap ${className}`}>
          <button
            type="button"
            className={`nb-bell${state === "denied" ? " is-denied" : ""}`}
            onClick={() => (state === "denied" ? setHelp((h) => !h) : void subscribe())}
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
          {help && (
            <span className="nb-bell-help" role="dialog">
              <button type="button" onClick={() => setHelp(false)} aria-label="Close">
                ×
              </button>
              <b>{labels.blocked}</b>
              {labels.help}
            </span>
          )}
        </span>
      )}
      {toast && (
        <div className="nb-push-toast" role="status">
          ✓ {labels.enabled}
        </div>
      )}
    </>
  );
}
