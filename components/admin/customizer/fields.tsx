"use client";

import { useEffect, useRef, useState } from "react";
import { MediaLibraryModal } from "../MediaLibraryModal";
import type { GlobalColor, MenuLink, Responsive } from "@/lib/theme/types";

export type Device = "d" | "t" | "m";

/** "uploads/x.webp" or a full URL → something an <img> can show. */
export function mediaSrc(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path.startsWith("/uploads/") ? `/upload/media/${path.slice(9)}` : path;
  return path.startsWith("uploads/") ? `/upload/media/${path.slice(8)}` : `/${path}`;
}

export function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`cz-section${open ? " open" : ""}`}>
      <button type="button" className="cz-section-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"}`} />
      </button>
      {open && <div className="cz-section-body">{children}</div>}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="cz-toggle">
      <span className="cz-toggle-text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="cz-switch" aria-hidden="true" />
    </label>
  );
}

export function Text({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <label className="cz-field">
      <span className="cz-label">{label}</span>
      {multiline ? (
        <textarea rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <small className="cz-hint">{hint}</small>}
    </label>
  );
}

export function NumberField({ label, value, onChange, min, max, unit }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }) {
  return (
    <label className="cz-field cz-field-inline">
      <span className="cz-label">{label}</span>
      <span className="cz-num">
        <input type="number" value={Number.isFinite(value) ? value : ""} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} />
        {unit && <em>{unit}</em>}
      </span>
    </label>
  );
}

export function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <label className="cz-field">
      <span className="cz-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/** WP-style color control: a swatch that opens a picker with the global palette, custom hex and clear. */
export function ColorField({ label, value, onChange, palette }: { label: string; value: string; onChange: (v: string) => void; palette: GlobalColor[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const resolved = /^var\(--gc-([\w-]+)\)$/.exec(value)?.[1];
  const shown = resolved ? palette.find((p) => p.slug === resolved)?.color ?? "" : value;
  const hex = /^#[0-9a-f]{6}$/i.test(shown) ? shown : /^#[0-9a-f]{3}$/i.test(shown) ? "#" + shown.slice(1).split("").map((c) => c + c).join("") : "#ffffff";
  return (
    <div className="cz-color" ref={ref}>
      <span className="cz-label">{label}</span>
      <button type="button" className={`cz-swatch${value ? "" : " is-empty"}`} style={{ background: shown || undefined }} onClick={() => setOpen((o) => !o)} title={value || "Default"} />
      {open && (
        <div className="cz-picker">
          <div className="cz-picker-palette">
            {palette.map((p) => (
              <button
                type="button"
                key={p.slug}
                title={p.name}
                className={`cz-pal${resolved === p.slug ? " active" : ""}`}
                style={{ background: p.color }}
                onClick={() => onChange(`var(--gc-${p.slug})`)}
              />
            ))}
          </div>
          <div className="cz-picker-row">
            <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} />
            <input type="text" value={value} placeholder="#hex or rgba()" onChange={(e) => onChange(e.target.value.trim())} />
          </div>
          <div className="cz-picker-row">
            <button type="button" className="cz-link-btn" onClick={() => onChange("")}>
              Clear (use default)
            </button>
            <button type="button" className="cz-link-btn" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MediaField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cz-field">
      <span className="cz-label">{label}</span>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cz-media-preview" src={mediaSrc(value)} alt="" onClick={() => setOpen(true)} />
      ) : (
        <button type="button" className="cz-media-empty" onClick={() => setOpen(true)}>
          Select image
        </button>
      )}
      {value && (
        <div className="cz-btn-row">
          <button type="button" className="cz-btn-outline" onClick={() => onChange("")}>
            Remove
          </button>
          <button type="button" className="cz-btn-outline" onClick={() => setOpen(true)}>
            Change
          </button>
        </div>
      )}
      {hint && <small className="cz-hint">{hint}</small>}
      <MediaLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(item) => {
          onChange(item.path.replace(/^\/+/, ""));
          setOpen(false);
        }}
      />
    </div>
  );
}

/** Value per device (desktop / tablet / mobile) with the WP device icons. */
export function ResponsiveField({ label, value, onChange, unit, device, setDevice }: { label: string; value: Responsive<string>; onChange: (v: Responsive<string>) => void; unit?: string; device: Device; setDevice: (d: Device) => void }) {
  return (
    <div className="cz-field">
      <span className="cz-label cz-label-row">
        {label}
        <span className="cz-devices">
          {(["d", "t", "m"] as Device[]).map((d) => (
            <button type="button" key={d} className={device === d ? "active" : ""} onClick={() => setDevice(d)} title={d === "d" ? "Desktop" : d === "t" ? "Tablet" : "Mobile"}>
              <i className={`fas ${d === "d" ? "fa-desktop" : d === "t" ? "fa-tablet-screen-button" : "fa-mobile-screen-button"}`} />
            </button>
          ))}
        </span>
      </span>
      <span className="cz-num">
        <input type="text" inputMode="decimal" value={value[device] ?? ""} placeholder={device !== "d" && value.d ? value.d : ""} onChange={(e) => onChange({ ...value, [device]: e.target.value.trim() })} />
        {unit && <em>{unit}</em>}
      </span>
    </div>
  );
}

/** Editable list of links (menus, footer columns, menu strip); optional one level of sub-items. */
export function LinkList({ items, onChange, nested = false, addLabel = "Add item" }: { items: MenuLink[]; onChange: (v: MenuLink[]) => void; nested?: boolean; addLabel?: string }) {
  const set = (i: number, patch: Partial<MenuLink>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="cz-links">
      {items.map((it, i) => (
        <div className="cz-link" key={i}>
          <div className="cz-link-row">
            <input value={it.label} placeholder="Label" onChange={(e) => set(i, { label: e.target.value })} />
            <input value={it.url} placeholder="/url or https://" onChange={(e) => set(i, { url: e.target.value })} />
          </div>
          <div className="cz-link-actions">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">
              <i className="fas fa-arrow-up" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down">
              <i className="fas fa-arrow-down" />
            </button>
            {nested && (
              <button type="button" onClick={() => set(i, { children: [...(it.children ?? []), { label: "", url: "" }] })} title="Add sub-item">
                <i className="fas fa-indent" /> Sub-item
              </button>
            )}
            <button type="button" className="danger" onClick={() => onChange(items.filter((_, j) => j !== i))} title="Remove">
              <i className="fas fa-trash" />
            </button>
          </div>
          {nested && (it.children?.length ?? 0) > 0 && (
            <div className="cz-sublinks">
              <LinkList items={it.children ?? []} onChange={(children) => set(i, { children })} addLabel="Add sub-item" />
            </div>
          )}
        </div>
      ))}
      <button type="button" className="cz-btn-outline cz-add" onClick={() => onChange([...items, { label: "", url: "" }])}>
        <i className="fas fa-plus" /> {addLabel}
      </button>
    </div>
  );
}
