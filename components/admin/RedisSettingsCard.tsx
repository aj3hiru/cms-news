"use client";

import { useState } from "react";
import { saveRedisAdmin, testRedisAdmin, type RedisAdminView } from "@/lib/cacheManagerAdmin";

/** Cache Manager → Settings: connect the Redis object cache (host, port, password, database). */
export function RedisSettingsCard({ initial }: { initial: RedisAdminView }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port);
  const [db, setDb] = useState(initial.db);
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(initial.hasPassword);
  const [busy, setBusy] = useState<"" | "test" | "save">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const input = () => ({ enabled, host, port, db, password });

  async function test() {
    setBusy("test");
    setMsg(null);
    const r = await testRedisAdmin(input()).catch(() => ({ ok: false, message: "Could not test — please try again." }));
    setMsg({ ok: r.ok, text: r.message });
    setBusy("");
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    const r = await saveRedisAdmin(input()).catch(() => ({ ok: false, message: "Could not save — please try again." }));
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok && password) {
      setHasPassword(true);
      setPassword("");
    }
    setBusy("");
  }

  return (
    <div className="cm-card">
      <h3>
        <i className="fas fa-database" style={{ color: "var(--primary)" }} /> Redis object cache
      </h3>
      <p className="cm-hint">
        Optional fast memory store on the server. Keys are kept under <code>cmsnews:</code> in their own database number, so other sites using the same Redis are never
        touched. If Redis stops, the site keeps working without it.
        {initial.source === "env" && " Currently set by REDIS_URL on the server — saving here takes over."}
      </p>
      <div className="cm-field-row">
        <label className="cm-fl">Use Redis</label>
        <label className="cm-toggle-row">
          <div className="cm-toggle-switch">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={!!busy} />
            <span className="cm-toggle-slider" />
          </div>
          <span>{enabled ? "On" : "Off"}</span>
        </label>
      </div>
      <div className="cm-field-row">
        <label className="cm-fl">Host</label>
        <input className="cm-select" value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" disabled={!!busy} />
      </div>
      <div className="cm-field-row">
        <label className="cm-fl">Port</label>
        <input className="cm-select" type="number" min={1} max={65535} value={port} onChange={(e) => setPort(Number(e.target.value))} disabled={!!busy} />
      </div>
      <div className="cm-field-row">
        <label className="cm-fl">Password</label>
        <input
          className="cm-select"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={hasPassword ? "•••••••• saved — leave empty to keep" : "Redis password (if any)"}
          disabled={!!busy}
        />
      </div>
      <div className="cm-field-row">
        <label className="cm-fl">Database number</label>
        <input className="cm-select" type="number" min={0} max={15} value={db} onChange={(e) => setDb(Number(e.target.value))} disabled={!!busy} />
      </div>
      {msg && (
        <p className="cm-hint" style={{ color: msg.ok ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
          <i className={`fas ${msg.ok ? "fa-check-circle" : "fa-exclamation-circle"}`} /> {msg.text}
        </p>
      )}
      <div style={{ display: "flex", gap: ".5rem", marginTop: ".75rem" }}>
        <button type="button" className="btn btn-secondary" onClick={test} disabled={!!busy}>
          {busy === "test" ? "Testing…" : "Test connection"}
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!!busy}>
          {busy === "save" ? "Saving…" : "Save Redis settings"}
        </button>
      </div>
    </div>
  );
}
