"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  clearPushHistory,
  deletePushCampaign,
  fetchArticleMeta,
  generatePushKeys,
  getPushCampaignsPage,
  getPushDeliveryLog,
  getDefaultPushIcon,
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
import { PushAnalyticsTab } from "./PushV2";

type Overview = Awaited<ReturnType<typeof getPushOverview>>;
type Tab = "compose" | "reports" | "history" | "settings";
type PostHit = Awaited<ReturnType<typeof searchPostsForPush>>[number];

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "";
const src = (p: string) =>
  !p
    ? ""
    : /^https?:\/\//.test(p) || p.startsWith("/")
      ? p
      : p.startsWith("uploads/")
        ? `/upload/media/${p.slice(8)}`
        : `/${p}`;

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
  const [tab, setTab] = useState<Tab>(
    initialOverview.configured ? "compose" : "settings",
  );
  const [overview, setOverview] = useState(initialOverview);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [segmentId, setSegmentId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(
    Math.max(1, Math.ceil(initialOverview.campaigns / 25)),
  );
  const refresh = useCallback(async () => {
    const [o, c, g] = await Promise.all([
      getPushOverview(),
      getPushCampaignsPage(page),
      listPushSegments(),
    ]);
    setOverview(o);
    setCampaigns(c.rows);
    setPages(c.pages);
    if (c.page !== page) setPage(c.page);
    setSegments(g);
  }, [page]);
  const goPage = async (p: number) => {
    const c = await getPushCampaignsPage(p);
    setCampaigns(c.rows);
    setPages(c.pages);
    setPage(c.page);
  };
  useEffect(() => {
    listPushSegments()
      .then(setSegments)
      .catch(() => {});
  }, []);

  // Live progress while something is sending.
  const active = campaigns.some(
    (c) => c.status === "pending" || c.status === "processing",
  );
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => void refresh(), 2500);
    return () => clearInterval(t);
  }, [active, refresh]);

  const clickRate = overview.totalSent
    ? Math.round((overview.totalClicks / overview.totalSent) * 1000) / 10
    : 0;
  const n = (v: number) => v.toLocaleString("en-IN");
  return (
    <div className="pn-wrap px">
      <div className="px-strip">
        <div className="px-num">
          <span>Subscribers</span>
          <strong>{n(overview.subscribers)}</strong>
          <small className={overview.today ? "up" : ""}>
            +{n(overview.today)} today
          </small>
        </div>
        <div className="px-num">
          <span>New this week</span>
          <strong>{n(overview.last7)}</strong>
          <small>last 7 days</small>
        </div>
        <div className="px-num">
          <span>Delivered</span>
          <strong>{n(overview.totalSent)}</strong>
          <small>
            {n(overview.campaigns)} notification
            {overview.campaigns === 1 ? "" : "s"}
          </small>
        </div>
        <div className="px-num">
          <span>Click rate</span>
          <strong>{clickRate}%</strong>
          <small>
            {n(overview.totalClicks)} click
            {overview.totalClicks === 1 ? "" : "s"}
          </small>
        </div>
        <div className="px-state">
          {!overview.configured ? (
            <button
              type="button"
              className="px-chip warn"
              onClick={() => isAdmin && setTab("settings")}
              title="Create the keys in Settings"
            >
              Not set up
            </button>
          ) : overview.collect ? (
            <span
              className="px-chip on"
              title="Visitors are asked to allow notifications"
            >
              Collecting
            </span>
          ) : (
            <button
              type="button"
              className="px-chip off"
              onClick={() => isAdmin && setTab("settings")}
              title="Visitors are not asked; existing subscribers still get notifications"
            >
              Paused
            </button>
          )}
        </div>
      </div>
      <div className="pn-tabs">
        {(
          [
            ["compose", "fa-paper-plane", "Send"],
            ["reports", "fa-chart-simple", "Reports"],
            ["history", "fa-clock-rotate-left", "History"],
            ...(isAdmin
              ? ([["settings", "fa-gear", "Settings"]] as const)
              : []),
          ] as const
        ).map(([id, icon, label]) => (
          <button
            type="button"
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <i className={`fas ${icon}`} /> {label}
            {id === "history" && active && <span className="pn-live" />}
          </button>
        ))}
      </div>
      {tab === "compose" && (
        <Compose
          disabled={!overview.configured || overview.subscribers === 0}
          configured={overview.configured}
          siteHost={siteHost}
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
      {tab === "reports" && <PushAnalyticsTab />}
      {tab === "history" && (
        <History
          campaigns={campaigns}
          onChange={refresh}
          isAdmin={isAdmin}
          host={siteHost}
          page={page}
          pages={pages}
          onPage={goPage}
        />
      )}
      {tab === "settings" && (
        <Settings overview={overview} isAdmin={isAdmin} onSaved={refresh} />
      )}
    </div>
  );
}

function Compose({
  disabled,
  configured,
  siteHost,
  subscribers,
  siteName,
  onSent,
  segments,
  segmentId,
  setSegmentId,
  defaultIcon,
}: {
  disabled: boolean;
  configured: boolean;
  siteHost: string;
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
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
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
  const [extUrl, setExtUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState("");
  const [site, setSite] = useState(siteHost);
  const [siteIcon, setSiteIcon] = useState("");
  useEffect(() => {
    getDefaultPushIcon()
      .then(setSiteIcon)
      .catch(() => {});
  }, []);

  /** LaraPush-style: any article URL → title, short text, featured image and that site's icon. */
  async function fetchUrl() {
    setFetching(true);
    setFetchErr("");
    const r = await fetchArticleMeta(extUrl);
    setFetching(false);
    if (!r.ok) return setFetchErr(r.error);
    setTitle(r.title);
    setBody(r.body);
    setUrl(r.url);
    setImage(r.image);
    setIcon(r.icon);
    setSite(r.site);
    setPostId(r.postId);
    setMsg(null);
  }

  const [listOpen, setListOpen] = useState(false);
  useEffect(() => {
    if (!listOpen) return;
    const t = setTimeout(
      () =>
        searchPostsForPush(q)
          .then(setHits)
          .catch(() => setHits([])),
      250,
    );
    return () => clearTimeout(t);
  }, [q, listOpen]);

  function pick(p: PostHit) {
    setExtUrl("");
    setFetchErr("");
    setIcon("");
    setSite(siteHost);
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
    const r = await sendPushNotification({
      title,
      body,
      url,
      image,
      postId,
      sendAt: when === "later" && sendAt ? new Date(sendAt).toISOString() : "",
      segmentId,
      icon,
    });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Could not send." });
    setMsg({
      ok: true,
      text: r.scheduled
        ? "Scheduled."
        : `Sending to ${r.total?.toLocaleString("en-IN")} subscribers…`,
    });
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
      if (!("serviceWorker" in navigator) || !("PushManager" in window))
        throw new Error("This browser does not support push notifications.");
      const cfg = (await fetch("/api/push/subscribe").then((r) =>
        r.json(),
      )) as { publicKey?: string };
      if (!cfg.publicKey)
        throw new Error(
          "Push is not set up, or collecting subscribers is turned off in Settings.",
        );
      if ((await Notification.requestPermission()) !== "granted")
        throw new Error(
          "Notifications are blocked in this browser. Allow them from the lock icon next to the address.",
        );
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const keyBytes = Uint8Array.from(
        atob(
          (cfg.publicKey + "=".repeat((4 - (cfg.publicKey.length % 4)) % 4))
            .replace(/-/g, "+")
            .replace(/_/g, "/"),
        ),
        (c) => c.charCodeAt(0),
      );
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const k = sub.options.applicationServerKey
          ? new Uint8Array(sub.options.applicationServerKey)
          : null;
        if (
          k &&
          (k.length !== keyBytes.length || k.some((b, i) => b !== keyBytes[i]))
        ) {
          await sub.unsubscribe();
          sub = null;
        }
      }
      sub ??= await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes,
      });
      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          key: cfg.publicKey,
          lang: navigator.language || "",
        }),
      });
      if (!saved.ok) throw new Error("Could not save this browser.");
      const r = await sendTestPush({
        title,
        body,
        url,
        image,
        icon,
        endpoint: sub.endpoint,
      });
      setTestMsg(
        r.ok
          ? { ok: true, text: "✓ Test notification sent to this browser." }
          : { ok: false, text: r.error ?? "Test failed." },
      );
    } catch (e) {
      setTestMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Test failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="px-send">
      <div className="pn-card">
        <div className="px-step">
          <b>
            <em>1</em> Post URL
          </b>
          <div className="px-fetch">
            <input
              className="pn-input"
              inputMode="url"
              placeholder="Paste any article link — your site, a WordPress site, any site"
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && extUrl.trim() && void fetchUrl()
              }
            />
            <button
              type="button"
              className="pn-btn"
              onClick={fetchUrl}
              disabled={!extUrl.trim() || fetching}
            >
              <i
                className={`fas ${fetching ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`}
              />{" "}
              {fetching ? "Fetching…" : "Fetch"}
            </button>
          </div>
          {fetchErr && <p className="pn-err">{fetchErr}</p>}
          <p className="px-sub px-hint">
            Title, short text, featured image and the site icon are filled in
            for you — edit anything below.
          </p>
          <details
            className="px-more"
            open={listOpen}
            onToggle={(e) => setListOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary>Or pick one of your posts</summary>
            <div>
              <div className="px-search">
                <i className="fas fa-magnifying-glass" />
                <input
                  className="pn-input"
                  placeholder="Search your posts…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="pn-posts">
                {hits.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={postId === p.id ? "active" : ""}
                    onClick={() => pick(p)}
                  >
                    {p.imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageSrc} alt="" />
                    ) : (
                      <span className="pn-noimg" />
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
          </details>
        </div>

        <div className="px-step">
          <b>
            <em>2</em> Write the notification
          </b>
          <label className="pn-field">
            Title <em>{title.length}/80</em>
            <input
              className="pn-input"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Breaking: …"
            />
          </label>
          <label className="pn-field">
            Message <em>{body.length}/180</em>
            <textarea
              className="pn-input"
              rows={2}
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="One or two short lines"
            />
          </label>
          <label className="pn-field">
            Link
            <input
              className="pn-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/post-address or https://…"
            />
          </label>
          <details className="px-more">
            <summary>Image and icon</summary>
            <div className="px-two">
              <div className="pn-field">
                Image
                <div className="pn-img-row">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src(image)} alt="" />
                  ) : null}
                  <button
                    type="button"
                    className="pn-btn-light"
                    onClick={() => setPicker(true)}
                  >
                    {image ? "Change" : "Choose"}
                  </button>
                  {image && (
                    <button
                      type="button"
                      className="pn-link"
                      onClick={() => setImage("")}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="pn-field">
                Icon
                <div className="pn-img-row">
                  {icon || defaultIcon || siteIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src(icon || defaultIcon || siteIcon)}
                      alt=""
                      className="pn-icon-img"
                    />
                  ) : (
                    <span className="pn-muted">Site icon</span>
                  )}
                  <button
                    type="button"
                    className="pn-btn-light"
                    onClick={() => setIconPicker(true)}
                  >
                    Change
                  </button>
                  {icon && (
                    <button
                      type="button"
                      className="pn-link"
                      onClick={() => setIcon("")}
                    >
                      Use this site&apos;s icon
                    </button>
                  )}
                </div>
              </div>
            </div>
          </details>
        </div>

        <div className="px-step">
          <b>
            <em>3</em> Send
          </b>
          <div className={segments.length ? "px-two" : ""}>
            {segments.length > 0 && (
              <label className="pn-field">
                Send to
                <select
                  className="pn-input"
                  value={segmentId ?? ""}
                  onChange={(e) =>
                    setSegmentId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">
                    All subscribers ({subscribers.toLocaleString("en-IN")})
                  </option>
                  {segments.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.count.toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="pn-field">
              When
              <select
                className="pn-input"
                value={when}
                onChange={(e) => setWhen(e.target.value as "now" | "later")}
              >
                <option value="now">Right now</option>
                <option value="later">At a set time</option>
              </select>
            </label>
          </div>
          {when === "later" && (
            <label className="pn-field">
              Date and time
              <input
                type="datetime-local"
                className="pn-input"
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
              />
            </label>
          )}
          <div className="px-go">
            <button
              type="button"
              className="pn-btn"
              onClick={send}
              disabled={
                busy ||
                disabled ||
                !title.trim() ||
                !url.trim() ||
                (when === "later" && !sendAt)
              }
            >
              <i className="fas fa-paper-plane" />{" "}
              {busy
                ? "Sending…"
                : when === "later"
                  ? "Schedule"
                  : `Send to ${audience.toLocaleString("en-IN")} subscriber${audience === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              className="pn-btn-light"
              onClick={test}
              disabled={testing}
            >
              <i
                className={`fas ${testing ? "fa-spinner fa-spin" : "fa-vial"}`}
              />{" "}
              Send a test to me
            </button>
          </div>
          {msg && <p className={msg.ok ? "pn-ok" : "pn-err"}>{msg.text}</p>}
          {testMsg && (
            <p className={testMsg.ok ? "pn-ok" : "pn-err"}>{testMsg.text}</p>
          )}
          {disabled && (
            <p className="pn-muted">
              {!configured
                ? "Push is not set up yet — create the keys in Settings (one click)."
                : "No subscribers yet — readers subscribe from the prompt or the bell."}
            </p>
          )}
        </div>
      </div>

      <div className="px-preview">
        <NotificationPreview
          site={site || siteName}
          title={title}
          body={body}
          image={image ? src(image) : ""}
          icon={src(icon || defaultIcon || siteIcon)}
        />
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

type DeliveryLog = Awaited<ReturnType<typeof getPushDeliveryLog>>;

function History({
  campaigns,
  onChange,
  isAdmin,
  host,
  page,
  pages,
  onPage,
}: {
  campaigns: CampaignRow[];
  onChange: () => void;
  isAdmin: boolean;
  host: string;
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  const label = (s: string) =>
    s === "processing" ? "Sending" : s.charAt(0).toUpperCase() + s.slice(1);
  const [open, setOpen] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<number, DeliveryLog>>({});
  function toggle(id: number) {
    const next = open === id ? null : id;
    setOpen(next);
    // always fresh: numbers change while a notification is still sending
    if (next !== null)
      getPushDeliveryLog(next)
        .then((l) => setLogs((x) => ({ ...x, [next]: l })))
        .catch(() => {});
  }
  return (
    <div className="pn-card px-gap">
      <div className="pn-head">
        <div>
          <h3>Push history</h3>
          <p className="px-sub" style={{ margin: 0 }}>
            Click a notification to see how it was delivered.
          </p>
        </div>
        {isAdmin && campaigns.length > 0 && (
          <button
            type="button"
            className="pn-btn-light"
            onClick={async () => {
              if (
                !confirm(
                  "Clear the whole notification history? Notifications still being delivered or scheduled stay.",
                )
              )
                return;
              await clearPushHistory();
              onChange();
            }}
          >
            <i className="fas fa-broom" /> Clear history
          </button>
        )}
      </div>
      {!campaigns.length ? (
        <p className="pn-muted">
          Nothing sent yet. Notifications you send appear here with their
          deliveries and clicks.
        </p>
      ) : (
        <div className="pn-scroll">
          <table className="pn-table px-sent">
            <thead>
              <tr>
                <th>Notification</th>
                <th>Domain / Segment</th>
                <th className="num">Delivered</th>
                <th className="num">Clicks</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const live =
                  c.status === "pending" || c.status === "processing";
                const pct = c.total
                  ? Math.min(
                      100,
                      Math.round(((c.sent + c.failed) / c.total) * 100),
                    )
                  : 0;
                const lg = logs[c.id];
                const isOpen = open === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr
                      className={`px-camp${isOpen ? " open" : ""}`}
                      tabIndex={0}
                      title="Show the delivery log"
                      onClick={(e) =>
                        !(e.target as HTMLElement).closest(".pn-icon") &&
                        toggle(c.id)
                      }
                      onKeyDown={(e) => e.key === "Enter" && toggle(c.id)}
                    >
                      <td className="px-t">
                        <strong>
                          <span className="pn-id">#{c.id}</span>
                          {c.title}
                          {c.source === "auto" && (
                            <span className="pn-badge pn-auto">Auto</span>
                          )}
                        </strong>
                        <small>{c.body}</small>
                        {live && (
                          <div className="pn-progress">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-t">
                        <strong className="px-light">{host}</strong>
                        <small>{c.segmentName ?? "All subscribers"}</small>
                      </td>
                      <td className="num px-del" data-l="Delivered">
                        <b>{c.sent.toLocaleString("en-IN")}</b> /{" "}
                        {c.total.toLocaleString("en-IN")}
                        {c.failed > 0 && (
                          <span className="px-fail">
                            {c.failed.toLocaleString("en-IN")} failed
                          </span>
                        )}
                      </td>
                      <td className="num px-del" data-l="Clicks">
                        <b>{c.clicks.toLocaleString("en-IN")}</b>
                        {c.sent > 0 && (
                          <span className="px-pc">
                            {((c.clicks / c.sent) * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`pn-badge pn-${c.status}`}>
                          {label(c.status)}
                        </span>
                      </td>
                      <td className="px-del px-nowrap">
                        {c.status === "scheduled"
                          ? `For ${fmt(c.sendAt)}`
                          : fmt(c.createdAt)}
                      </td>
                      <td className="px-acts">
                        <span className="px-chev">
                          <i className="fas fa-chevron-down" />
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            className="pn-icon"
                            title={
                              c.status === "scheduled" ? "Cancel" : "Delete"
                            }
                            onClick={async () => {
                              if (
                                !confirm(
                                  c.status === "scheduled"
                                    ? "Cancel this scheduled notification?"
                                    : "Delete this notification from the history?",
                                )
                              )
                                return;
                              await deletePushCampaign(c.id);
                              onChange();
                            }}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="px-logrow">
                        <td colSpan={7}>
                          <div className="px-log">
                            {!lg ? (
                              "Loading…"
                            ) : !lg.ok ? (
                              lg.error
                            ) : (
                              <LogBody log={lg} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="pn-pager">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            ‹ Prev
          </button>
          {pageList(page, pages).map((p, i) =>
            p === 0 ? (
              <em key={`gap${i}`}>…</em>
            ) : (
              <button
                type="button"
                key={p}
                className={p === page ? "on" : ""}
                onClick={() => onPage(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

/** 1 … 4 5 6 … 20 (0 = gap) */
function pageList(page: number, pages: number): number[] {
  const set = new Set(
    [1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages),
  );
  const out: number[] = [];
  [...set]
    .sort((a, b) => a - b)
    .forEach((p, i, a) => {
      if (i && p - a[i - 1] > 1) out.push(0);
      out.push(p);
    });
  return out;
}

function LogBody({ log }: { log: Extract<DeliveryLog, { ok: true }> }) {
  const w = (n: number) => `${log.total ? (n / log.total) * 100 : 0}%`;
  const n = (v: number) => v.toLocaleString("en-IN");
  return (
    <>
      <div className="px-log-nums">
        <span>
          <b>{n(log.total)}</b> queued
        </span>
        <span className="ok">
          <b>{n(log.sent)}</b> delivered
        </span>
        <span className="bad">
          <b>{n(log.failed)}</b> failed
        </span>
        {log.waiting > 0 && (
          <span className="wait">
            <b>{n(log.waiting)}</b>{" "}
            {log.expired ? "not sent (expired)" : "waiting"}
          </span>
        )}
        <span>
          <b>{n(log.clicks)}</b> clicks
          {log.sent ? ` (${((log.clicks / log.sent) * 100).toFixed(1)}%)` : ""}
        </span>
      </div>
      <div className="px-log-bar">
        <i className="ok" style={{ width: w(log.sent) }} />
        <i className="bad" style={{ width: w(log.failed) }} />
        <i className="wait" style={{ width: w(log.waiting) }} />
      </div>
      <p className="px-log-meta">
        {log.segment} · {fmt(log.created)} ·{" "}
        <a href={log.url} target="_blank" rel="noopener noreferrer">
          {log.url}
        </a>
      </p>
      {log.errors.length > 0 && (
        <>
          <p className="px-log-h">Why some failed</p>
          <ul className="px-log-err">
            {log.errors.map((e) => (
              <li key={e.why}>
                <b>{n(e.n)}</b> {e.why}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Settings({
  overview,
  isAdmin,
  onSaved,
}: {
  overview: Overview;
  isAdmin: boolean;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(overview.subject);
  const [autoPrompt, setAutoPrompt] = useState(overview.autoPrompt);
  const [delay, setDelay] = useState(overview.promptDelay);
  const [showBell, setShowBell] = useState(overview.showBell);
  const [autoSend, setAutoSend] = useState(overview.autoSendOnPublish);
  const [icon, setIcon] = useState(overview.icon);
  const [collect, setCollect] = useState(overview.collect);
  const [keySets, setKeySets] = useState<
    Awaited<ReturnType<typeof listPushKeySets>>
  >([]);
  const [imp, setImp] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (isAdmin)
      listPushKeySets()
        .then(setKeySets)
        .catch(() => {});
  }, [isAdmin, overview.publicFingerprint]);
  const [pub, setPub] = useState("");
  const [priv, setPriv] = useState("");
  const [picker, setPicker] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okText: string,
    out = setMsg,
  ) {
    out(null);
    const r = await fn();
    out(
      r.ok
        ? { ok: true, text: okText }
        : { ok: false, text: r.error ?? "Failed." },
    );
    if (r.ok) onSaved();
  }

  if (!isAdmin)
    return (
      <div className="pn-card pn-muted">
        Only admins can change push settings.
      </div>
    );
  return (
    <div className="px-set">
      <div className="pn-card">
        <h3>General</h3>
        <Switch
          on={collect}
          set={setCollect}
          title="Collect subscribers"
          hint="Visitors are asked to allow notifications. Off: no prompt and no bell — existing subscribers still get notifications."
        />
        <Switch
          on={showBell}
          set={setShowBell}
          title="Bell icon in the header"
          hint="Hidden once a reader has subscribed."
        />
        <Switch
          on={autoPrompt}
          set={setAutoPrompt}
          title="Ask readers automatically"
          hint="Not more than once every 3 days."
        />
        {autoPrompt && (
          <label className="pn-field pn-inline px-delay">
            Ask after
            <input
              className="pn-input"
              type="number"
              min={1}
              max={60}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
            />{" "}
            seconds
          </label>
        )}
        <Switch
          on={autoSend}
          set={setAutoSend}
          title="Send automatically for new posts"
          hint="When a post is published, all subscribers get it."
        />
        <label className="pn-field" style={{ marginTop: 14 }}>
          Contact email <em>sent to push services with each notification</em>
          <input
            className="pn-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <div className="pn-field">
          Notification icon
          <div className="pn-img-row">
            {icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src(icon)} alt="" className="pn-icon-img" />
            )}
            <button
              type="button"
              className="pn-btn-light"
              onClick={() => setPicker(true)}
            >
              {icon ? "Change" : "Choose icon"}
            </button>
          </div>
        </div>
        <div className="px-go">
          <button
            type="button"
            className="pn-btn"
            onClick={() =>
              run(
                () =>
                  savePushOptions({
                    subject,
                    autoPrompt,
                    promptDelay: delay,
                    showBell,
                    autoSendOnPublish: autoSend,
                    icon,
                    collect,
                  }),
                "Saved.",
              )
            }
          >
            <i className="fas fa-floppy-disk" /> Save
          </button>
          {msg && (
            <span className={msg.ok ? "pn-ok" : "pn-err"}>{msg.text}</span>
          )}
        </div>
      </div>
      <div className="px-col">
        <div className="pn-card">
          <h3>Keys</h3>
          {overview.configured ? (
            <p className="px-ok">
              <i className="fas fa-circle-check" /> Set up ·{" "}
              {overview.publicFingerprint}
            </p>
          ) : (
            <p className="px-sub">
              Browsers need a key pair to receive notifications from this site.
              Create one — it stays private on the server.
            </p>
          )}
          {!overview.configured && (
            <button
              type="button"
              className="pn-btn"
              onClick={() =>
                void run(
                  () => generatePushKeys(subject),
                  "Keys created — push is ready.",
                  setKeyMsg,
                )
              }
            >
              <i className="fas fa-wand-magic-sparkles" /> Create keys
            </button>
          )}
          <details className="px-more">
            <summary>Use keys from another install</summary>
            <div>
              <label className="pn-field">
                Public key
                <input
                  className="pn-input"
                  value={pub}
                  onChange={(e) => setPub(e.target.value)}
                />
              </label>
              <label className="pn-field">
                Private key
                <input
                  className="pn-input"
                  type="password"
                  value={priv}
                  onChange={(e) => setPriv(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="pn-btn-light"
                onClick={() =>
                  run(
                    () => importPushKeys(pub, priv, subject),
                    "Keys saved.",
                    setKeyMsg,
                  )
                }
              >
                Save keys
              </button>
            </div>
          </details>
          {keyMsg && (
            <p className={keyMsg.ok ? "pn-ok" : "pn-err"}>{keyMsg.text}</p>
          )}
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
                      <code>{k.fingerprint}</code>{" "}
                      {k.current ? (
                        <span className="pn-badge pn-completed">Current</span>
                      ) : (
                        <small className="pn-muted">imported</small>
                      )}
                    </td>
                    <td className="num">
                      {k.subscribers.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pn-card">
          <h3>Backup</h3>
          <p className="px-sub">
            One file with every key and subscriber — to restore, or to move push
            to another site (EduMint files work too).
          </p>
          <div className="px-go">
            <a className="pn-btn-light" href="/api/admin/push-transfer">
              <i className="fas fa-download" /> Export
            </a>
            <label className="pn-btn-light px-file">
              <i className="fas fa-upload" /> Import a file
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImp({ ok: true, text: "Importing…" });
                  const fd = new FormData();
                  fd.set("file", f);
                  const r = await fetch("/api/admin/push-transfer", {
                    method: "POST",
                    body: fd,
                  })
                    .then((x) => x.json())
                    .catch(() => ({ error: "Import failed." }));
                  e.target.value = "";
                  if (r.error) return setImp({ ok: false, text: r.error });
                  setImp({
                    ok: true,
                    text: `✓ Imported: ${r.keys} new key set${r.keys === 1 ? "" : "s"}, ${r.added} new subscriber${r.added === 1 ? "" : "s"}, ${r.updated} updated${r.skipped ? `, ${r.skipped} skipped (no key or broken)` : ""}.`,
                  });
                  onSaved();
                  listPushKeySets()
                    .then(setKeySets)
                    .catch(() => {});
                }}
              />
            </label>
          </div>
          {imp && <p className={imp.ok ? "pn-ok" : "pn-err"}>{imp.text}</p>}
        </div>
        {overview.configured && (
          <div className="pn-card px-danger">
            <h3>Danger zone</h3>
            <p className="px-sub">
              Reset makes a new key and erases the old key
              {keySets.length > 1 ? "s" : ""} and all{" "}
              {overview.subscribers.toLocaleString("en-IN")} subscriber
              {overview.subscribers === 1 ? "" : "s"}. Readers who allowed
              notifications re-subscribe on their next visit. Export first.
            </p>
            <button
              type="button"
              className="pn-btn pn-btn-danger"
              onClick={() => {
                if (
                  !confirm(
                    `Reset push keys?\n\nThis erases the old key(s) and all ${overview.subscribers} subscribers. Readers who allowed notifications re-subscribe on their next visit.`,
                  )
                )
                  return;
                const t = prompt(
                  "Type RESET to erase the old keys and subscribers",
                );
                if (t === null) return;
                void run(
                  () => resetPushKeys(t, subject),
                  "New keys are ready — the old keys and subscribers were erased.",
                  setKeyMsg,
                );
              }}
            >
              <i className="fas fa-rotate" /> Reset keys
            </button>
          </div>
        )}
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

function Switch({
  on,
  set,
  title,
  hint,
}: {
  on: boolean;
  set: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="pn-switch">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => set(e.target.checked)}
      />
      <span>
        <b>{title}</b>
        <small>{hint}</small>
      </span>
    </label>
  );
}

/** What readers see: an Android notification and a desktop (Chrome / Windows) one. */
function NotificationPreview({
  site,
  title,
  body,
  image,
  icon,
}: {
  site: string;
  title: string;
  body: string;
  image: string;
  icon: string;
}) {
  const t = title || "Notification title";
  const b = body || "A short line about the post…";
  return (
    <div className="npv">
      <p className="npv-label">Android</p>
      <div className="npv-android">
        <div className="npv-head">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" className="npv-sico" />
          ) : (
            <span className="npv-sico npv-blank" />
          )}
          <span>Chrome · {site} · now</span>
        </div>
        <div className="npv-row">
          <div>
            <strong>{t}</strong>
            <p>{b}</p>
          </div>
          {icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" className="npv-lico" />
          )}
        </div>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="npv-img" />
        )}
      </div>
      <p className="npv-label">Desktop</p>
      <div className="npv-desk">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="npv-img" />
        )}
        <div className="npv-row">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" className="npv-dico" />
          ) : (
            <span className="npv-dico npv-blank" />
          )}
          <div>
            <strong>{t}</strong>
            <p>{b}</p>
            <small>Google Chrome · {site}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
