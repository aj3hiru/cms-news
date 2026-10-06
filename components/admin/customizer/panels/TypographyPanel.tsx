"use client";

import { useMemo, useState } from "react";
import { TYPO_TARGETS, newTypoRule, type ThemeFont, type TypoRule, type TypoTarget } from "@/lib/theme/types";
import { useCz } from "../Customizer";
import { CircleBtn, Hint, ResponsiveField, Select, Toggle } from "../fields";

const SYSTEM_FONTS = ["System Default", "Arial", "Helvetica", "Georgia", "Times New Roman", "Verdana", "Tahoma", "Trebuchet MS"];
export const GOOGLE_FONTS = [
  "Noto Sans Devanagari", "Noto Serif Devanagari", "Hind", "Mukta", "Poppins", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Source Sans 3", "Nunito", "Nunito Sans",
  "Raleway", "Rubik", "Work Sans", "PT Sans", "Merriweather", "Playfair Display", "Lora", "Oswald", "Barlow", "DM Sans", "Manrope", "Figtree", "Lexend", "Lexend Deca",
  "Libre Baskerville", "Baloo 2", "Tiro Devanagari Hindi", "Khand", "Rajdhani", "Yatra One", "Roboto Slab", "Roboto Condensed", "Ubuntu", "Mulish", "Quicksand", "Josefin Sans",
  "Archivo", "IBM Plex Sans", "Plus Jakarta Sans", "Outfit", "Sora", "Space Grotesk", "Kanit", "Prompt", "Cairo", "Tajawal", "Noto Sans", "Noto Serif", "Source Serif 4",
];
const VARIANTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900", "400italic", "700italic"];
const WEIGHTS: [string, string][] = [["", "Default"], ...["100", "200", "300", "400", "500", "600", "700", "800", "900"].map((w) => [w, w] as [string, string]), ["normal", "Normal"], ["bold", "Bold"]];

const GROUPS: { label: string; targets: TypoTarget[] }[] = [
  { label: "Base", targets: ["body"] },
  { label: "Header", targets: ["site_title", "tagline"] },
  { label: "Primary Navigation", targets: ["primary_menu", "sub_menu", "menu_strip"] },
  { label: "Content", targets: ["buttons", "post_title", "archive_title", "h1", "h2", "h3", "h4", "h5", "h6", "meta"] },
  { label: "Widgets", targets: ["widget_title"] },
  { label: "Footer", targets: ["footer"] },
  { label: "Custom", targets: ["custom"] },
];

/** Typography: Font Manager + Typography Manager (GeneratePress-style). */
export function TypographyPanel() {
  const { theme, update, device, setDevice } = useCz();
  const [openFont, setOpenFont] = useState<number | null>(null);
  const [openRule, setOpenRule] = useState<string | null>(null);
  const familyOptions = useMemo(() => [...theme.fonts.map((f) => f.family), ...SYSTEM_FONTS.slice(1)], [theme.fonts]);
  const setRule = (id: string, patch: Partial<TypoRule>) =>
    update((t) => {
      t.typography = t.typography.map((r) => (r.id === id ? { ...r, ...patch } : r));
    });

  function addFont() {
    update((t) => void t.fonts.push({ family: "", google: true, variants: ["400", "700"], fallback: "sans-serif" }));
    setOpenFont(theme.fonts.length);
  }
  function addRule() {
    const used = new Set(theme.typography.map((r) => r.target));
    const next = (Object.keys(TYPO_TARGETS) as TypoTarget[]).find((k) => !used.has(k) && k !== "custom") ?? "custom";
    const rule = newTypoRule(next);
    update((t) => void t.typography.push(rule));
    setOpenRule(rule.id);
  }

  return (
    <>
      <div className="cz-block">
        <div className="cz-block-head">
          <strong>Font Manager</strong>
        </div>
        {theme.fonts.map((f, i) => (
          <div className={`cz-item${openFont === i ? " open" : ""}`} key={i}>
            <div className="cz-item-row">
              <span className="cz-item-title" style={{ fontFamily: f.family ? `"${f.family}", ${f.fallback}` : undefined }}>
                {f.family || "New font"}
              </span>
              <CircleBtn icon={openFont === i ? "fa-chevron-up" : "fa-chevron-down"} title="Edit font" onClick={() => setOpenFont(openFont === i ? null : i)} />
              <CircleBtn
                icon="fa-trash-can"
                title="Delete font"
                danger
                onClick={() => {
                  update((t) => void t.fonts.splice(i, 1));
                  setOpenFont(null);
                }}
              />
            </div>
            {openFont === i && (
              <div className="cz-item-card">
                <FontEditor font={f} onChange={(nf) => update((t) => void (t.fonts[i] = nf))} />
                <button type="button" className="cz-btn-outline cz-btn-sm" onClick={() => setOpenFont(null)}>
                  Close
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" className="cz-btn-primary" onClick={addFont}>
          Add Font
        </button>
        <Select
          label="Google font-display"
          value={theme.font_display}
          onChange={(v) => update((t) => void (t.font_display = v))}
          options={[
            ["auto", "Auto"],
            ["block", "Block"],
            ["swap", "Swap"],
            ["fallback", "Fallback"],
            ["optional", "Optional"],
          ]}
        />
        <a className="cz-learn" href="https://developer.mozilla.org/docs/Web/CSS/@font-face/font-display" target="_blank" rel="noopener">
          Learn about font-display
        </a>
      </div>

      <div className="cz-block">
        <div className="cz-block-head">
          <strong>Typography Manager</strong>
        </div>
        {GROUPS.map((g) => {
          const rules = theme.typography.filter((r) => g.targets.includes(r.target));
          if (!rules.length) return null;
          return (
            <div className="cz-typo-group" key={g.label}>
              <h4>{g.label}</h4>
              {rules.map((r) => (
                <div className={`cz-item${openRule === r.id ? " open" : ""}`} key={r.id}>
                  <div className="cz-item-row">
                    <span className="cz-item-title">
                      {[r.target === "custom" ? r.selector || "Custom" : TYPO_TARGETS[r.target], r.family, r.size.d ? `${r.size.d}${r.sizeUnit}` : ""].filter(Boolean).join(" / ")}
                    </span>
                    <CircleBtn icon={openRule === r.id ? "fa-chevron-up" : "fa-chevron-down"} title="Edit" onClick={() => setOpenRule(openRule === r.id ? null : r.id)} />
                    <CircleBtn
                      icon="fa-trash-can"
                      title="Delete"
                      danger
                      onClick={() =>
                        update((t) => {
                          t.typography = t.typography.filter((x) => x.id !== r.id);
                        })
                      }
                    />
                  </div>
                  {openRule === r.id && (
                    <div className="cz-item-card">
                      <Select label="Target Element" value={r.target} onChange={(v) => setRule(r.id, { target: v })} options={(Object.keys(TYPO_TARGETS) as TypoTarget[]).map((k) => [k, TYPO_TARGETS[k]])} />
                      {r.target === "custom" && (
                        <label className="cz-field">
                          <span className="cz-label">CSS selector</span>
                          <input value={r.selector} placeholder=".entry-content p" onChange={(e) => setRule(r.id, { selector: e.target.value })} />
                        </label>
                      )}
                      <Select label="Font Family" value={r.family} onChange={(v) => setRule(r.id, { family: v })} options={[["", "Default"], ...familyOptions.map((f) => [f, f] as [string, string])]} />
                      {!theme.fonts.length && <Hint>Add fonts in the Font Manager above to use them here.</Hint>}
                      <div className="cz-grid2">
                        <Select label="Font Weight" value={r.weight} onChange={(v) => setRule(r.id, { weight: v })} options={WEIGHTS} />
                        <Select
                          label="Text Transform"
                          value={r.transform}
                          onChange={(v) => setRule(r.id, { transform: v })}
                          options={[
                            ["", "Default"],
                            ["none", "None"],
                            ["uppercase", "Uppercase"],
                            ["lowercase", "Lowercase"],
                            ["capitalize", "Capitalize"],
                          ]}
                        />
                        <Select
                          label="Font Style"
                          value={r.style}
                          onChange={(v) => setRule(r.id, { style: v })}
                          options={[
                            ["", "Default"],
                            ["normal", "Normal"],
                            ["italic", "Italic"],
                          ]}
                        />
                        <Select
                          label="Text Decoration"
                          value={r.decoration}
                          onChange={(v) => setRule(r.id, { decoration: v })}
                          options={[
                            ["", "Default"],
                            ["none", "None"],
                            ["underline", "Underline"],
                            ["line-through", "Line-through"],
                          ]}
                        />
                      </div>
                      <ResponsiveField label="Font size" unit={r.sizeUnit} value={r.size} onChange={(v) => setRule(r.id, { size: v })} device={device} setDevice={setDevice} slider={{ min: 8, max: 80, step: 1 }} />
                      <div className="cz-unit-row">
                        {(["px", "em", "rem"] as const).map((u) => (
                          <button type="button" key={u} className={r.sizeUnit === u ? "active" : ""} onClick={() => setRule(r.id, { sizeUnit: u })}>
                            {u}
                          </button>
                        ))}
                      </div>
                      <ResponsiveField label="Line Height" value={r.lineHeight} onChange={(v) => setRule(r.id, { lineHeight: v })} device={device} setDevice={setDevice} slider={{ min: 0.8, max: 3, step: 0.05 }} />
                      <ResponsiveField label="Letter Spacing" unit="em" value={r.letterSpacing} onChange={(v) => setRule(r.id, { letterSpacing: v })} device={device} setDevice={setDevice} slider={{ min: -0.1, max: 0.5, step: 0.01 }} />
                      <ResponsiveField
                        label={r.target === "body" ? "Paragraph Bottom Margin" : "Bottom Margin"}
                        unit="em"
                        value={r.marginBottom}
                        onChange={(v) => setRule(r.id, { marginBottom: v })}
                        device={device}
                        setDevice={setDevice}
                        slider={{ min: 0, max: 4, step: 0.1 }}
                      />
                      <button type="button" className="cz-btn-outline cz-btn-sm" onClick={() => setOpenRule(null)}>
                        Close
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        <button type="button" className="cz-btn-primary" onClick={addRule}>
          Add Typography
        </button>
      </div>
    </>
  );
}

function FontEditor({ font, onChange }: { font: ThemeFont; onChange: (f: ThemeFont) => void }) {
  const [q, setQ] = useState(font.family);
  const [show, setShow] = useState(false);
  const matches = GOOGLE_FONTS.filter((f) => !q || f.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  return (
    <>
      <div className="cz-field cz-combobox">
        <span className="cz-label">Font family name</span>
        <input
          value={q}
          placeholder="Search Google Fonts or type a name"
          onFocus={() => setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 150)}
          onChange={(e) => {
            setQ(e.target.value);
            onChange({ ...font, family: e.target.value });
          }}
        />
        {show && matches.length > 0 && (
          <div className="cz-combo-list">
            {matches.map((f) => (
              <button
                type="button"
                key={f}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(f);
                  setShow(false);
                  onChange({ ...font, family: f, google: true });
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
      <Toggle label="Use Google Fonts API" checked={font.google} onChange={(v) => onChange({ ...font, google: v })} hint="Off = a font already installed on the device." />
      {font.google && (
        <div className="cz-field">
          <span className="cz-label">Variants</span>
          <div className="cz-checks">
            {VARIANTS.map((v) => (
              <label key={v}>
                <input
                  type="checkbox"
                  checked={font.variants.includes(v)}
                  onChange={(e) => onChange({ ...font, variants: e.target.checked ? [...font.variants, v] : font.variants.filter((x) => x !== v) })}
                />
                {v}
              </label>
            ))}
          </div>
        </div>
      )}
      <Select
        label="Category (fallback)"
        value={font.fallback}
        onChange={(v) => onChange({ ...font, fallback: v })}
        options={[
          ["sans-serif", "Sans-serif"],
          ["serif", "Serif"],
          ["monospace", "Monospace"],
          ["cursive", "Handwriting"],
          ["system-ui", "System UI"],
        ]}
      />
    </>
  );
}
