"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearPushHistory,
  deletePushCampaign,
  fetchArticleMeta,
  generatePushKeys,
  getPushCampaigns,
  getPushOverview,
  importPushKeys,
  listPushKeySets,
  listPushSegments,
  resetPushKeys,
  savePushOptions,
  searchPostsForPush,
  sendPushNotification,
  sendTestPush,
  type CampaignRow,
  type SegmentRow,
} from "@/lib/push/admin";
import { MediaLibraryModal } from "../MediaLibraryModal";
import { PushAnalyticsTab, PushSegmentsTab } from "./PushV2";

type Overview = Awaited<ReturnType<typeof getPushOverview>>;
type Tab = "compose" | "analytics" | "segments" | "history" | "settings";
type PostHit = Awaited<ReturnType<typeof searchPostsForPush>>[number];

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "");
const src = (p: string) => (!p ? "" : /^https?:\/\//.test(p) || p.startsWith("/") ? p : p.startsWith("uploads/") ? `/upload/media/${p.slice(8)}` : `/${p}`);

export function PushAdmin({
  overview: initialOverview,
  campaigns: initialCampaigns,
  isAdmin,
  siteName,
  siteHost = "",
}: {
  overview: Overview;
  campaigns: CampaignRow[];
  isAdmin: boolean;
  siteName: string;
  siteHost?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialOverview.configured ? "compose" : "settings");
  const [overview, setOverview] = useState(initialOverview);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [segmentId, setSegmentId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [o, c, g] = await Promise.all([getPushOverview(), getPushCampaigns(), listPushSegments()]);
    setOverview(o);
    setCampaigns(c);
    setSegments(g);
  }, []);
  useEffect(() => {
    listPushSegments().then(setSegments).catch(() => {});
  }, []);

  // Live progress while something is sending.
  const active = campaigns.some((c) => c.status === "pending" || c.status === "processing");
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => void refresh(), 2500);
    return () => clearInterval(t);
  }, [active, refresh]);

  return (
    <div className="pn-wrap">
      <div className="pn-stats">
        <Stat icon="fa-users" label="Subscribers" value={overview.subscribers} tone="violet" />
        <Stat icon="fa-user-plus" label="New today" value={overview.today} tone="green" />
        <Stat icon="fa-calendar-week" label="Last 7 days" value={overview.last7} tone="blue" />
        <Stat icon="fa-paper-plane" label="Delivered" value={overview.totalSent} tone="amber" />
        <Stat icon="fa-hand-pointer" label="Clicks" value={overview.totalClicks} tone="rose" />
      </div>
      {overview.configured && !overview.collect && (
        <div className="pn-alert">
          <i className="fas fa-circle-pause" /> Collecting new subscribers is turned off — visitors aren&apos;t asked and the bell is hidden.
        </div>
      )}
      {!overview.configured && (
        <div className="pn-alert">
          <i className="fas fa-triangle-exclamation" /> Push notifications are not set up yet. Open <b>Settings</b> and press <b>Generate keys</b> — it takes one click.
        </div>
      )}
      <div className="pn-tabs">
        {(
          [
            ["compose", "fa-pen-to-square", "Send Notification"],
            ["analytics", "fa-chart-pie", "Analytics"],
            ["segments", "fa-layer-group", "Segments"],
            ["history", "fa-clock-rotate-left", "History"],
            ...(isAdmin ? ([["settings", "fa-gear", "Settings"]] as const) : []),
          ] as const
        ).map(([id, icon, label]) => (
          <button type="button" key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <i className={`fas ${icon}`} /> {label}
            {id === "history" && active && <span className="pn-live" />}
          </button>
        ))}
      </div>
      {tab === "compose" && (
        <Compose
          disabled={!overview.configured || overview.subscribers === 0}
          subscribers={overview.subscribers}
          siteName={siteName}
          segments={segments}
          segmentId={segmentId}
          setSegmentId={setSegmentId}
          defaultIcon={overview.icon}
          onSent={async () => {
            await refresh();
            setTab("history");
          }}
        />
      )}
      {tab === "analytics" && <PushAnalyticsTab />}
      {tab === "segments" && (
        <PushSegmentsTab
          onChanged={() => void refresh()}
          onSendTo={(id) => {
            setSegmentId(id);
            setTab("compose");
          }}
        />
      )}
      {tab === "history" && <History campaigns={campaigns} onChange={refresh} isAdmin={isAdmin} host={siteHost} />}
      {tab === "settings" && <Settings overview={overview} isAdmin={isAdmin} onSaved={refresh} />}
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: string }) {
  return (
    <div className={`pn-stat pn-${tone}`}>
      <i className={`fas ${icon}`} />
      <div>
        <strong>{value.toLocaleString("en-IN")}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Compose({
  disabled,
  subscribers,
  siteName,
  onSent,
  segments,
  segmentId,
  setSegmentId,
  defaultIcon,
}: {
  disabled: boolean;
  subscribers: number;
  siteName: string;
  onSent: () => void;
  segments: SegmentRow[];
  segmentId: number | null;
  setSegmentId: (id: number | null) => void;
  defaultIcon: string;
}) {
  const [icon, setIcon] = useState("");
  const [iconPicker, setIconPicker] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const seg = segments.find((s) => s.id === segmentId) ?? null;
  const audience = seg ? seg.count : subscribers;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [postId, setPostId] = useState<number | null>(null);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [sendAt, setSendAt] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PostHit[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [source, setSource] = useState<"site" | "url">("site");
  const [extUrl, setExtUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState("");

  async function fetchExternal() {
    setFetching(true);
    setFetchErr("");
    const r = await fetchArticleMeta(extUrl);
    setFetching(false);
    if (!r.ok) return setFetchErr(r.error);
    setTitle(r.title);
    setBody(r.body);
    setUrl(r.url);
    setImage(r.image);
    setPostId(null);
    setMsg(null);
  }

  useEffect(() => {
    const t = setTimeout(() => searchPostsForPush(q).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q]);

  function pick(p: PostHit) {
    setTitle(p.title);
    setBody(p.body);
    setUrl(p.url);
    setImage(p.image);
    setPostId(p.id);
    setMsg(null);
  }

  async function send() {
    setBusy(true);
    setMsg(null);
    const r = await sendPushNotification({ title, body, url, image, postId, sendAt: when === "later" && sendAt ? new Date(sendAt).toISOString() : "", segmentId, icon });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Could not send." });
    setMsg({ ok: true, text: r.scheduled ? "Scheduled." : `Sending to ${r.total?.toLocaleString("en-IN")} subscribers…` });
    setTitle("");
    setBody("");
    setUrl("");
    setImage("");
    setPostId(null);
    onSent();
  }

  /** Subscribes this browser (if needed) and sends it a test notification right away. */
  async function test() {
    setTesting(true);
    setTestMsg(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("This browser does not support push notifications.");
      const cfg = (await fetch("/api/push/subscribe").then((r) => r.json())) as { publicKey?: string };
      if (!cfg.publicKey) throw new Error("Push is not set up, or collecting subscribers is turned off in Settings.");
      if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications are blocked in this browser. Allow them from the lock icon next to the address.");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const keyBytes = Uint8Array.from(atob((cfg.publicKey + "=".repeat((4 - (cfg.publicKey.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const k = sub.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
        if (k && (k.length !== keyBytes.length || k.some((b, i) => b !== keyBytes[i]))) {
          await sub.unsubscribe();
          sub = null;
        }
      }
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes });
      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), key: cfg.publicKey, lang: navigator.language || "" }),
      });
      if (!saved.ok) throw new Error("Could not save this browser.");
      const r = await sendTestPush({ title, body, url, image, icon, endpoint: sub.endpoint });
      setTestMsg(r.ok ? { ok: true, text: "✓ Test notification sent to this browser." } : { ok: false, text: r.error ?? "Test failed." });
    } catch (e) {
      setTestMsg({ ok: false, text: e instanceof Error ? e.message : "Test failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="pn-compose">
      <div className="pn-card">
        <h3>
          <i className="fas fa-newspaper" /> Pick an article
        </h3>
        <div className="pn-src">
          <button type="button" className={source === "site" ? "active" : ""} onClick={() => setSource("site")}>
            <i className="fas fa-house" /> This site
          </button>
          <button type="button" className={source === "url" ? "active" : ""} onClick={() => setSource("url")}>
            <i className="fas fa-globe" /> Any website
          </button>
        </div>
        {source === "url" ? (
          <div className="pn-ext">
            <p className="pn-muted">Paste the link of any article (any website). Its title, description and image are filled in for you.</p>
            <input className="pn-input" placeholder="https://example.com/article…" value={extUrl} onChange={(e) => setExtUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && extUrl && void fetchExternal()} />
            <button type="button" className="pn-btn" onClick={fetchExternal} disabled={!extUrl.trim() || fetching}>
              <i className={`fas ${fetching ? "fa-spinner fa-spin" : "fa-cloud-arrow-down"}`} /> {fetching ? "Fetching…" : "Fetch article"}
            </button>
            {fetchErr && <p className="pn-err">{fetchErr}</p>}
          </div>
        ) : (
        <>
        <input className="pn-input" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="pn-posts">
          {hits.map((p) => (
            <button type="button" key={p.id} className={postId === p.id ? "active" : ""} onClick={() => pick(p)}>
              {p.imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageSrc} alt="" />
              ) : (
                <span className="pn-noimg">
                  <i className="fas fa-image" />
                </span>
              )}
              <span>
                <strong>{p.title}</strong>
                <small>{fmt(p.date)}</small>
              </span>
            </button>
          ))}
          {!hits.length && <p className="pn-muted">No posts found.</p>}
        </div>
        </>
        )}
      </div>

      <div className="pn-card">
        <h3>
          <i className="fas fa-bell" /> Notification
        </h3>
        <label className="pn-field">
          Title <em>{title.length}/80</em>
          <input className="pn-input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Breaking: …" />
        </label>
        <label className="pn-field">
          Message <em>{body.length}/180</em>
          <textarea className="pn-input" rows={3} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="One or two short lines" />
        </label>
        <label className="pn-field">
          Link
          <input className="pn-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/post-slug or https://…" />
        </label>
        <div className="pn-field">
          Image (optional)
          <div className="pn-img-row">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src(image)} alt="" />
            ) : null}
            <button type="button" className="pn-btn-light" onClick={() => setPicker(true)}>
              {image ? "Change" : "Choose image"}
            </button>
            {image && (
              <button type="button" className="pn-link" onClick={() => setImage("")}>
                Remove
              </button>
            )}
          </div>
        </div>
        <div className="pn-field">
          Icon
          <div className="pn-img-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {icon || defaultIcon ? <img src={src(icon || defaultIcon)} alt="" className="pn-icon-img" /> : <span className="pn-muted">Site icon</span>}
            <button type="button" className="pn-btn-light" onClick={() => setIconPicker(true)}>
              Change
            </button>
            {icon && (
              <button type="button" className="pn-link" onClick={() => setIcon("")}>
                Use default
              </button>
            )}
          </div>
        </div>
        <label className="pn-field">
          Send to
          <select className="pn-input" value={segmentId ?? ""} onChange={(e) => setSegmentId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">All subscribers ({subscribers.toLocaleString("en-IN")})</option>
            {segments.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.count.toLocaleString("en-IN")})
              </option>
            ))}
          </select>
        </label>
        <div className="pn-when">
          <label>
            <input type="radio" checked={when === "now"} onChange={() => setWhen("now")} /> Send now
          </label>
          <label>
            <input type="radio" checked={when === "later"} onChange={() => setWhen("later")} /> Schedule
          </label>
          {when === "later" && <input type="datetime-local" className="pn-input" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />}
        </div>
        {msg && <p className={msg.ok ? "pn-ok" : "pn-err"}>{msg.text}</p>}
        <button type="button" className="pn-btn" onClick={send} disabled={busy || disabled || !title.trim() || !url.trim() || (when === "later" && !sendAt)}>
          <i className="fas fa-paper-plane" /> {busy ? "Sending…" : when === "later" ? "Schedule" : `Send to ${audience.toLocaleString("en-IN")} subscriber${audience === 1 ? "" : "s"}`}
        </button>
        <button type="button" className="pn-btn-light pn-test" onClick={test} disabled={testing}>
          <i className={`fas ${testing ? "fa-spinner fa-spin" : "fa-vial"}`} /> Test push (this browser)
        </button>
        {testMsg && <p className={testMsg.ok ? "pn-ok" : "pn-err"}>{testMsg.text}</p>}
        {disabled && <p className="pn-muted">{subscribers === 0 ? "No subscribers yet — visitors subscribe with the bell in the header." : "Set up the keys in Settings first."}</p>}
      </div>

      <div className="pn-card pn-preview-card">
        <h3>
          <i className="fas fa-mobile-screen-button" /> Live lock screen preview
        </h3>
        <PhonePreview appName={siteName} title={title} body={body} image={image ? src(image) : ""} />
        <p className="pn-muted pn-center">Roughly how it appears on a modern Android phone.</p>
      </div>
      <MediaLibraryModal
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(i) => {
          setImage(i.path.replace(/^\/+/, ""));
          setPicker(false);
        }}
      />
      <MediaLibraryModal
        open={iconPicker}
        onClose={() => setIconPicker(false)}
        onSelect={(i) => {
          setIcon(i.path.replace(/^\/+/, ""));
          setIconPicker(false);
        }}
      />
    </div>
  );
}

function History({ campaigns, onChange, isAdmin, host }: { campaigns: CampaignRow[]; onChange: () => void; isAdmin: boolean; host: string }) {
  if (!campaigns.length)
    return (
      <div className="pn-empty">
        <i className="fas fa-inbox" />
        <p>No notifications sent yet.</p>
      </div>
    );
  return (
    <div className="pn-history">
      {isAdmin && (
        <div className="pn-history-bar">
          <span className="pn-muted">Clicks are counted when a reader opens the notification&apos;s link on this site.</span>
          <button
            type="button"
            className="pn-btn-light"
            onClick={async () => {
              if (!confirm("Clear the whole notification history? Notifications still being delivered or scheduled stay.")) return;
              await clearPushHistory();
              onChange();
            }}
          >
            <i className="fas fa-broom" /> Clear history
          </button>
        </div>
      )}
      {campaigns.map((c) => {
        const doneN = c.sent + c.failed;
        const pct = c.total ? Math.min(100, Math.round((doneN / c.total) * 100)) : 0;
        const ctr = c.sent ? ((c.clicks / c.sent) * 100).toFixed(1) : "0.0";
        return (
          <div className="pn-camp" key={c.id}>
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt="" />
            ) : (
              <span className="pn-noimg">
                <i className="fas fa-bell" />
              </span>
            )}
            <div className="pn-camp-main">
              <div className="pn-camp-top">
                <strong>
                  <span className="pn-id">#{c.id}</span> {c.title}
                </strong>
                <span className={`pn-badge pn-${c.status}`}>{c.status === "processing" ? "Sending" : c.status}</span>
                {c.source === "auto" && <span className="pn-badge pn-auto">Auto</span>}
              </div>
              <p>{c.body}</p>
              {(c.status === "pending" || c.status === "processing") && (
                <div className="pn-progress">
                  <span style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="pn-camp-meta">
                <span>
                  <i className="fas fa-globe" /> {host} · {c.segmentName ?? "All subscribers"}
                </span>
                <span>
                  <i className="fas fa-users" /> {c.total.toLocaleString("en-IN")}
                </span>
                <span>
                  <i className="fas fa-check" /> {c.sent.toLocaleString("en-IN")} delivered
                </span>
                {c.failed > 0 && (
                  <span>
                    <i className="fas fa-xmark" /> {c.failed.toLocaleString("en-IN")} failed
                  </span>
                )}
                <span>
                  <i className="fas fa-hand-pointer" /> {c.clicks} clicks ({ctr}%)
                </span>
                <span>
                  <i className="fas fa-clock" /> {c.status === "scheduled" ? `Scheduled ${fmt(c.sendAt)}` : fmt(c.createdAt)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="pn-icon"
              title={c.status === "scheduled" ? "Cancel" : "Delete"}
              onClick={async () => {
                if (!confirm(c.status === "scheduled" ? "Cancel this scheduled notification?" : "Delete this notification from the history?")) return;
                await deletePushCampaign(c.id);
                onChange();
              }}
            >
              <i className="fas fa-trash" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Settings({ overview, isAdmin, onSaved }: { overview: Overview; isAdmin: boolean; onSaved: () => void }) {
  const [subject, setSubject] = useState(overview.subject);
  const [autoPrompt, setAutoPrompt] = useState(overview.autoPrompt);
  const [delay, setDelay] = useState(overview.promptDelay);
  const [showBell, setShowBell] = useState(overview.showBell);
  const [autoSend, setAutoSend] = useState(overview.autoSendOnPublish);
  const [icon, setIcon] = useState(overview.icon);
  const [collect, setCollect] = useState(overview.collect);
  const [keySets, setKeySets] = useState<Awaited<ReturnType<typeof listPushKeySets>>>([]);
  const [imp, setImp] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (isAdmin) listPushKeySets().then(setKeySets).catch(() => {});
  }, [isAdmin, overview.publicFingerprint]);
  const [pub, setPub] = useState("");
  const [priv, setPriv] = useState("");
  const [picker, setPicker] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setMsg(null);
    const r = await fn();
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Failed." });
    if (r.ok) onSaved();
  }

  if (!isAdmin) return <div className="pn-card pn-muted">Only admins can change push settings.</div>;
  return (
    <div className="pn-settings">
      <div className="pn-card">
        <h3>
          <i className="fas fa-key" /> Keys (VAPID)
        </h3>
        {overview.configured ? (
          <p className="pn-ok">
            <i className="fas fa-circle-check" /> Set up · public {overview.publicFingerprint} · private {overview.privateFingerprint}
          </p>
        ) : (
          <p className="pn-muted">Browsers need a key pair to receive notifications from this site. Generate one — it stays private on the server.</p>
        )}
        <label className="pn-field">
          Contact email
          <input className="pn-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="you@example.com" />
        </label>
        <button
          type="button"
          className="pn-btn"
          onClick={() => {
            if (overview.configured && !confirm("New keys: everyone subscribed now will be re-subscribed automatically on their next visit. Continue?")) return;
            void run(() => generatePushKeys(subject), "New keys generated.");
          }}
        >
          <i className="fas fa-wand-magic-sparkles" /> {overview.configured ? "Generate new keys" : "Generate keys"}
        </button>
        <details className="pn-import">
          <summary>Use keys from another install</summary>
          <label className="pn-field">
            Public key
            <input className="pn-input" value={pub} onChange={(e) => setPub(e.target.value)} />
          </label>
          <label className="pn-field">
            Private key
            <input className="pn-input" type="password" value={priv} onChange={(e) => setPriv(e.target.value)} />
          </label>
          <button type="button" className="pn-btn-light" onClick={() => run(() => importPushKeys(pub, priv, subject), "Keys saved.")}>
            Save keys
          </button>
        </details>
        {keySets.length > 1 && (
          <table className="pn-table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Key set</th>
                <th className="num">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {keySets.map((k) => (
                <tr key={String(k.id)}>
                  <td>
                    <code>{k.fingerprint}</code> {k.current ? <span className="pn-badge pn-completed">Current</span> : <small className="pn-muted">imported</small>}
                  </td>
                  <td className="num">{k.subscribers.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {overview.configured && (
          <>
            <p className="pn-muted" style={{ margin: "12px 0" }}>
              Reset creates a new key and completely erases the old key{keySets.length > 1 ? "s" : ""} and all {overview.subscribers.toLocaleString("en-IN")} subscribers linked to{" "}
              {keySets.length > 1 ? "them" : "it"}. Readers who allowed notifications are subscribed again with the new key on their next visit. Export first if you want a backup.
            </p>
            <button
              type="button"
              className="pn-btn pn-btn-danger"
              onClick={() => {
                if (!confirm(`Reset push keys?\n\nThis erases the old key(s) and all ${overview.subscribers} subscribers. Readers who allowed notifications re-subscribe on their next visit.`)) return;
                const t = prompt("Type RESET to erase the old keys and subscribers");
                if (t === null) return;
                void run(() => resetPushKeys(t, subject), "New keys are ready — the old keys and subscribers were erased.");
              }}
            >
              <i className="fas fa-rotate" /> Reset keys
            </button>
          </>
        )}
      </div>
      <div className="pn-card">
        <h3>
          <i className="fas fa-file-export" /> Export / Import
        </h3>
        <p className="pn-muted">
          The export holds every key set and every subscriber (with device and country), so push can move to another site or be restored. Import accepts files with one or
          many key sets (also from EduMint); subscribers keep their own key and ones already here are updated, not doubled.
        </p>
        <a className="pn-btn-light" href="/api/admin/push-transfer">
          <i className="fas fa-download" /> Export keys + subscribers
        </a>
        <label className="pn-field" style={{ marginTop: 14 }}>
          Import a file
          <input
            type="file"
            accept=".json,application/json"
            className="pn-input"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setImp({ ok: true, text: "Importing…" });
              const fd = new FormData();
              fd.set("file", f);
              const r = await fetch("/api/admin/push-transfer", { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ error: "Import failed." }));
              e.target.value = "";
              if (r.error) return setImp({ ok: false, text: r.error });
              setImp({ ok: true, text: `✓ Imported: ${r.keys} new key set${r.keys === 1 ? "" : "s"}, ${r.added} new subscriber${r.added === 1 ? "" : "s"}, ${r.updated} updated${r.skipped ? `, ${r.skipped} skipped (no key or broken)` : ""}.` });
              onSaved();
              listPushKeySets().then(setKeySets).catch(() => {});
            }}
          />
        </label>
        {imp && <p className={imp.ok ? "pn-ok" : "pn-err"}>{imp.text}</p>}
      </div>
      <div className="pn-card">
        <h3>
          <i className="fas fa-sliders" /> Behaviour
        </h3>
        <label className="pn-check">
          <input type="checkbox" checked={collect} onChange={(e) => setCollect(e.target.checked)} />{" "}
          <span>
            <b>Collect subscribers</b> — off: no prompt and no bell; people who already subscribed still get your notifications
          </span>
        </label>
        <label className="pn-check">
          <input type="checkbox" checked={showBell} onChange={(e) => setShowBell(e.target.checked)} /> Bell icon in the header (hidden once a reader subscribes)
        </label>
        <label className="pn-check">
          <input type="checkbox" checked={autoPrompt} onChange={(e) => setAutoPrompt(e.target.checked)} /> Ask readers automatically (not more than once every 3 days)
        </label>
        <label className="pn-field pn-inline">
          Ask after
          <input className="pn-input" type="number" min={1} max={60} value={delay} onChange={(e) => setDelay(Number(e.target.value))} /> seconds
        </label>
        <label className="pn-check">
          <input type="checkbox" checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} /> Send a notification automatically when a post is published
        </label>
        <div className="pn-field">
          Notification icon
          <div className="pn-img-row">
            {icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src(icon)} alt="" className="pn-icon-img" />
            )}
            <button type="button" className="pn-btn-light" onClick={() => setPicker(true)}>
              {icon ? "Change" : "Choose icon"}
            </button>
          </div>
        </div>
        <button type="button" className="pn-btn" onClick={() => run(() => savePushOptions({ subject, autoPrompt, promptDelay: delay, showBell, autoSendOnPublish: autoSend, icon, collect }), "Settings saved.")}>
          Save settings
        </button>
        {msg && <p className={msg.ok ? "pn-ok" : "pn-err"}>{msg.text}</p>}
      </div>
      <MediaLibraryModal
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(i) => {
          setIcon(i.path.replace(/^\/+/, ""));
          setPicker(false);
        }}
      />
    </div>
  );
}

function PhonePreview({ appName, title, body, image }: { appName: string; title: string; body: string; image: string }) {
  // The viewer's own clock, filled in after mount (avoids a server/browser mismatch).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  const time = now ? now.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[ap]m$/i, "") : "";
  const date = now ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
  return (
    <div className="pn-phone">
      <div className="pn-phone-notch" />
      <div className="pn-phone-status">
        <span>{time}</span>
        <span>
          <i className="fas fa-signal" /> <i className="fas fa-wifi" /> <i className="fas fa-battery-three-quarters" />
        </span>
      </div>
      <div className="pn-phone-screen">
        <div className="pn-phone-time">{time}</div>
        <div className="pn-phone-date">{date}</div>
        <div key={`${title}|${image}`} className="pn-phone-card">
          <div className="pn-phone-head">
            <span className="pn-phone-app">
              <span className="pn-phone-ico">
                <i className="fas fa-bell" />
              </span>
              <b>{appName}</b>
            </span>
            <span>
              now <i className="fas fa-chevron-down" />
            </span>
          </div>
          <div className="pn-phone-body">
            <strong>{title || "Notification title"}</strong>
            <p>{body || "Notification text…"}</p>
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" />
            )}
          </div>
        </div>
      </div>
      <div className="pn-phone-home" />
    </div>
  );
}
