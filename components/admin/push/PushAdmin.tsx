"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePushCampaign,
  deletePushSubscriber,
  generatePushKeys,
  getPushCampaigns,
  getPushOverview,
  getPushSubscribers,
  importPushKeys,
  savePushOptions,
  searchPostsForPush,
  sendPushNotification,
  type CampaignRow,
} from "@/lib/push/admin";
import { MediaLibraryModal } from "../MediaLibraryModal";

type Overview = Awaited<ReturnType<typeof getPushOverview>>;
type Tab = "compose" | "history" | "subscribers" | "settings";
type PostHit = Awaited<ReturnType<typeof searchPostsForPush>>[number];

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");
const src = (p: string) => (!p ? "" : /^https?:\/\//.test(p) || p.startsWith("/") ? p : p.startsWith("uploads/") ? `/upload/media/${p.slice(8)}` : `/${p}`);

export function PushAdmin({ overview: initialOverview, campaigns: initialCampaigns, isAdmin, siteName }: { overview: Overview; campaigns: CampaignRow[]; isAdmin: boolean; siteName: string }) {
  const [tab, setTab] = useState<Tab>(initialOverview.configured ? "compose" : "settings");
  const [overview, setOverview] = useState(initialOverview);
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const refresh = useCallback(async () => {
    const [o, c] = await Promise.all([getPushOverview(), getPushCampaigns()]);
    setOverview(o);
    setCampaigns(c);
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
      {!overview.configured && (
        <div className="pn-alert">
          <i className="fas fa-triangle-exclamation" /> Push notifications are not set up yet. Open <b>Settings</b> and press <b>Generate keys</b> — it takes one click.
        </div>
      )}
      <div className="pn-tabs">
        {(
          [
            ["compose", "fa-pen-to-square", "Send Notification"],
            ["history", "fa-clock-rotate-left", "History"],
            ["subscribers", "fa-users", "Subscribers"],
            ["settings", "fa-gear", "Settings"],
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
          onSent={async () => {
            await refresh();
            setTab("history");
          }}
        />
      )}
      {tab === "history" && <History campaigns={campaigns} onChange={refresh} />}
      {tab === "subscribers" && <Subscribers isAdmin={isAdmin} />}
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

function Compose({ disabled, subscribers, siteName, onSent }: { disabled: boolean; subscribers: number; siteName: string; onSent: () => void }) {
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
    const r = await sendPushNotification({ title, body, url, image, postId, sendAt: when === "later" && sendAt ? new Date(sendAt).toISOString() : "" });
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

  return (
    <div className="pn-compose">
      <div className="pn-card">
        <h3>
          <i className="fas fa-newspaper" /> Pick a post
        </h3>
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
          <i className="fas fa-paper-plane" /> {busy ? "Sending…" : when === "later" ? "Schedule" : `Send to ${subscribers.toLocaleString("en-IN")} subscribers`}
        </button>
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
    </div>
  );
}

function History({ campaigns, onChange }: { campaigns: CampaignRow[]; onChange: () => void }) {
  if (!campaigns.length)
    return (
      <div className="pn-empty">
        <i className="fas fa-inbox" />
        <p>No notifications sent yet.</p>
      </div>
    );
  return (
    <div className="pn-history">
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
                <strong>{c.title}</strong>
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

function Subscribers({ isAdmin }: { isAdmin: boolean }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof getPushSubscribers>> | null>(null);
  useEffect(() => {
    getPushSubscribers(page).then(setData);
  }, [page]);
  if (!data) return <div className="pn-card pn-muted">Loading subscribers…</div>;
  return (
    <div className="pn-card">
      <h3>
        <i className="fas fa-users" /> {data.total.toLocaleString("en-IN")} subscribers
      </h3>
      <table className="pn-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Browser</th>
            <th>Country</th>
            <th>Subscribed</th>
            {isAdmin && <th />}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.browser}</td>
              <td>{r.country || "—"}</td>
              <td>{fmt(r.createdAt)}</td>
              {isAdmin && (
                <td>
                  <button
                    type="button"
                    className="pn-icon"
                    onClick={async () => {
                      if (!confirm("Remove this subscriber?")) return;
                      await deletePushSubscriber(r.id);
                      setData(await getPushSubscribers(page));
                    }}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {data.pages > 1 && (
        <div className="pn-pages">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span>
            {page} / {data.pages}
          </span>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            ›
          </button>
        </div>
      )}
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
      </div>
      <div className="pn-card">
        <h3>
          <i className="fas fa-sliders" /> Behaviour
        </h3>
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
        <button type="button" className="pn-btn" onClick={() => run(() => savePushOptions({ subject, autoPrompt, promptDelay: delay, showBell, autoSendOnPublish: autoSend, icon }), "Settings saved.")}>
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
