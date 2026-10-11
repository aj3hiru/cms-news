"use client";

import { useState } from "react";
import Link from "next/link";
import { MediaLibraryModal } from "../MediaLibraryModal";

/** Shared pieces of the Rank Math-style SEO screens. */

export function mediaSrc(p: string) {
  if (!p) return "";
  if (/^https?:\/\//.test(p)) return p;
  const r = p.replace(/^\/+/, "");
  return r.startsWith("uploads/") ? `/upload/media/${r.slice(8)}` : `/${r}`;
}

export function RmSwitch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <label className="rm-sw" title={label}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span aria-hidden="true" />
    </label>
  );
}

export function RmImage({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rm-img">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaSrc(value)} alt="" />
      )}
      <div className="rm-img-btns">
        <button type="button" className="rm-btn" onClick={() => setOpen(true)}>
          {value ? "Change Image" : "Add or Upload File"}
        </button>
        {value && (
          <button type="button" className="rm-btn danger" onClick={() => onChange("")}>
            Remove
          </button>
        )}
      </div>
      <MediaLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(i) => {
          onChange(i.path.replace(/^\/+/, ""));
          setOpen(false);
        }}
      />
    </div>
  );
}

const CRUMB: Record<string, string> = {
  dashboard: "Modules",
  general: "General Settings",
  titles: "SEO Titles & Meta",
  sitemap: "Sitemap Settings",
  indexing: "Instant Indexing",
  analyzer: "SEO Analyzer",
  status: "Status & Tools",
};

/** Breadcrumb row + Easy / Advanced mode switch, as at the top of every Rank Math screen. */
export function RmTop({ view, level, onLevel }: { view: string; level?: "easy" | "advanced"; onLevel?: (l: "easy" | "advanced") => void }) {
  return (
    <div className="rm-top">
      <div className="rm-crumbs">
        <Link href="/admin/seo">Dashboard</Link> / {CRUMB[view] ?? view}
      </div>
      {level && onLevel && (
        <div className="rm-mode" role="group" aria-label="Mode">
          <button type="button" className={level === "easy" ? "on" : ""} onClick={() => onLevel("easy")}>
            Easy Mode
          </button>
          <button type="button" className={level === "advanced" ? "on" : ""} onClick={() => onLevel("advanced")}>
            Advanced Mode
          </button>
        </div>
      )}
    </div>
  );
}
