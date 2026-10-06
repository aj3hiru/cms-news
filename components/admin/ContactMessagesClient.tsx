"use client";

import { useState, useTransition } from "react";
import { deleteContactMessage, setContactStatus } from "@/lib/contactAdmin";

interface Msg {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  ip: string | null;
  status: "new" | "read" | "replied";
  createdAt: string | null;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

/** Admin → Contact Messages: everything sent through [contact_form]. */
export function ContactMessagesClient({ rows, total, page, pages, status, counts }: { rows: Msg[]; total: number; page: number; pages: number; status: string; counts: Record<string, number> }) {
  const [open, setOpen] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const all = counts.new + counts.read + counts.replied;

  return (
    <div className="cm-wrap">
      <div className="cm-head">
        <div>
          <h2>Contact Messages</h2>
          <p>
            Messages sent with the <code>[contact_form]</code> shortcode. Put the shortcode on any page or post.
          </p>
        </div>
        <button type="button" className="cm-copy" onClick={() => navigator.clipboard?.writeText("[contact_form]")}>
          <i className="fas fa-copy" /> Copy shortcode
        </button>
      </div>
      <div className="cm-filters">
        {[
          ["all", `All (${all})`],
          ["new", `Unread (${counts.new})`],
          ["read", `Read (${counts.read})`],
          ["replied", `Replied (${counts.replied})`],
        ].map(([v, l]) => (
          <a key={v} href={v === "all" ? "/admin/contact-messages" : `/admin/contact-messages?status=${v}`} className={status === v ? "active" : ""}>
            {l}
          </a>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="cm-empty">
          <i className="fas fa-inbox" />
          <p>No messages yet.</p>
        </div>
      ) : (
        <div className="cm-list">
          {rows.map((m) => (
            <div key={m.id} className={`cm-item${m.status === "new" ? " unread" : ""}${open === m.id ? " open" : ""}`}>
              <button
                type="button"
                className="cm-row"
                onClick={() => {
                  setOpen(open === m.id ? null : m.id);
                  if (m.status === "new") start(() => setContactStatus(m.id, "read"));
                }}
              >
                <span className="cm-avatar">{m.name.slice(0, 1).toUpperCase()}</span>
                <span className="cm-who">
                  <strong>{m.name}</strong>
                  <small>{m.email}</small>
                </span>
                <span className="cm-snippet">{m.message.slice(0, 110)}</span>
                <span className={`cm-badge cm-${m.status}`}>{m.status === "new" ? "Unread" : m.status === "read" ? "Read" : "Replied"}</span>
                <time>{fmt(m.createdAt)}</time>
              </button>
              {open === m.id && (
                <div className="cm-body">
                  <p className="cm-text">{m.message}</p>
                  <div className="cm-meta">
                    {m.subject && <span>{m.subject}</span>}
                    {m.ip && <span>IP {m.ip}</span>}
                  </div>
                  <div className="cm-actions">
                    <a
                      className="btn btn-primary"
                      href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}&body=${encodeURIComponent(`\n\n> ${m.message.replace(/\n/g, "\n> ")}`)}`}
                      onClick={() => start(() => setContactStatus(m.id, "replied"))}
                    >
                      <i className="fas fa-reply" /> Reply by email
                    </a>
                    {m.status !== "new" && (
                      <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => start(() => setContactStatus(m.id, "new"))}>
                        Mark unread
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={pending}
                      onClick={() => {
                        if (confirm("Delete this message?")) start(() => deleteContactMessage(m.id));
                      }}
                    >
                      <i className="fas fa-trash" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="cm-pages">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <a key={p} className={p === page ? "active" : ""} href={`/admin/contact-messages?${status !== "all" ? `status=${status}&` : ""}page=${p}`}>
              {p}
            </a>
          ))}
          <span>{total} messages</span>
        </div>
      )}
    </div>
  );
}
