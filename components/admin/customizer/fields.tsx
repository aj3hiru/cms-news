"use client";

import { useEffect, useRef, useState } from "react";
import { MediaLibraryModal } from "../MediaLibraryModal";
import type { GlobalColor, Responsive } from "@/lib/theme/types";

export type Device = "d" | "t" | "m";

/** "uploads/x.webp" or a full URL → something an <img> can show. */
export function mediaSrc(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  const r = path.replace(/^\/+/, "");
  return r.startsWith("uploads/") ? `/upload/media/${r.slice(8)}` : `/${r}`;
}

/** Collapsible group, like a WP customizer section. */
export function Section({ title, children, defaultOpen = false, badge }: { title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`cz-section${open ? " open" : ""}`}>
      <button type="button" className="cz-section-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>
          {title}
          {badge && <em className="cz-badge">{badge}</em>}
        </span>
        <i className={`fas fa-chevron-${open ? "up" : "down"}`} />
      </button>
      {open && <div className="cz-section-body">{children}</div>}
    </div>
  );
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="cz-heading">{children}</h3>;
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="cz-hint">{children}</p>;
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

/** Number with a slider, like the WP range control. */
export function Range({ label, value, onChange, min, max, step = 1, unit }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string }) {
  return (
    <div className="cz-field">
      <span className="cz-label">{label}</span>
      <div className="cz-range">
        <input type="range" min={min} max={max} step={step} value={Number.isFinite(value) ? value : min} onChange={(e) => onChange(Number(e.target.value))} />
        <span className="cz-num">
          <input type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} />
          {unit && <em>{unit}</em>}
        </span>
      </div>
    </div>
  );
}

export function Select<T extends string>({ label, value, onChange, options, hint }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][]; hint?: string }) {
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
      {hint && <small className="cz-hint">{hint}</small>}
    </label>
  );
}

/** Button group (WP "segmented" control). */
export function Segmented<T extends string>({ label, value, onChange, options }: { label?: string; value: T; onChange: (v: T) => void; options: [T, string, string?][] }) {
  return (
    <div className="cz-field">
      {label && <span className="cz-label">{label}</span>}
      <div className="cz-seg">
        {options.map(([v, l, icon]) => (
          <button type="button" key={v} className={value === v ? "active" : ""} onClick={() => onChange(v)}>
            {icon && <i className={`fas ${icon}`} />} {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** WP-style color control: swatch → picker with the global palette, custom value and clear. */
export function ColorField({ label, value, onChange, palette }: { label: string; value: string; onChange: (v: string) => void; palette: GlobalColor[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const slug = /^var\(--gc-([\w-]+)\)$/.exec(value)?.[1];
  const shown = slug ? palette.find((p) => p.slug === slug)?.color ?? "" : value;
  const hex = /^#[0-9a-f]{6}$/i.test(shown) ? shown : /^#[0-9a-f]{3}$/i.test(shown) ? "#" + shown.slice(1).split("").map((c) => c + c).join("") : "#ffffff";
  const named = slug ? palette.find((p) => p.slug === slug)?.name : "";
  return (
    <div className="cz-color" ref={ref}>
      <span className="cz-color-label">
        {label}
        {named && <small>{named}</small>}
      </span>
      <button type="button" className={`cz-swatch${value ? "" : " is-empty"}`} style={{ background: shown || undefined }} onClick={() => setOpen((o) => !o)} title={value || "Default"} aria-label={`${label}: ${value || "default"}`} />
      {open && (
        <div className="cz-picker">
          <div className="cz-picker-title">Global colors</div>
          <div className="cz-picker-palette">
            {palette.map((p) => (
              <button type="button" key={p.slug} title={p.name} className={`cz-pal${slug === p.slug ? " active" : ""}`} style={{ background: p.color }} onClick={() => onChange(`var(--gc-${p.slug})`)} />
            ))}
          </div>
          <div className="cz-picker-title">Custom</div>
          <div className="cz-picker-row">
            <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} />
            <input type="text" value={value} placeholder="#hex or rgba()" onChange={(e) => onChange(e.target.value.trim())} />
          </div>
          <div className="cz-picker-row">
            <button type="button" className="cz-link-btn" onClick={() => onChange("")}>
              <i className="fas fa-rotate-left" /> Default
            </button>
            <button type="button" className="cz-btn-primary cz-btn-sm" onClick={() => setOpen(false)}>
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
          <i className="fas fa-image" /> Select image
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

/** Value per device (desktop / tablet / mobile) with WP device icons. */
export function ResponsiveField({
  label,
  value,
  onChange,
  unit,
  device,
  setDevice,
  slider,
}: {
  label: string;
  value: Responsive<string>;
  onChange: (v: Responsive<string>) => void;
  unit?: string;
  device: Device;
  setDevice: (d: Device) => void;
  slider?: { min: number; max: number; step: number };
}) {
  const v = value[device] ?? "";
  const fallback = device === "m" ? value.t || value.d : device === "t" ? value.d : "";
  return (
    <div className="cz-field">
      <span className="cz-label cz-label-row">
        {label}
        <span className="cz-devices cz-devices-sm">
          {(["d", "t", "m"] as Device[]).map((d) => (
            <button type="button" key={d} className={device === d ? "active" : ""} onClick={() => setDevice(d)} title={d === "d" ? "Desktop" : d === "t" ? "Tablet" : "Mobile"}>
              <i className={`fas ${d === "d" ? "fa-desktop" : d === "t" ? "fa-tablet-screen-button" : "fa-mobile-screen-button"}`} />
            </button>
          ))}
        </span>
      </span>
      <div className="cz-range">
        {slider && (
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={Number(v || fallback || slider.min)}
            onChange={(e) => onChange({ ...value, [device]: e.target.value })}
          />
        )}
        <span className="cz-num">
          <input type="text" inputMode="decimal" value={v} placeholder={fallback} onChange={(e) => onChange({ ...value, [device]: e.target.value.trim() })} />
          {unit && <em>{unit}</em>}
        </span>
        {v && (
          <button type="button" className="cz-reset" title="Reset" onClick={() => onChange({ ...value, [device]: "" })}>
            <i className="fas fa-rotate-left" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Circle icon button (the chevron / trash circles of the WP customizer). */
export function CircleBtn({ icon, title, onClick, danger }: { icon: string; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className={`cz-circle${danger ? " danger" : ""}`} title={title} aria-label={title} onClick={onClick}>
      <i className={`fas ${icon}`} />
    </button>
  );
}
