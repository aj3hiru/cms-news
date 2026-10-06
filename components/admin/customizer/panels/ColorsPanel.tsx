"use client";

import { useState } from "react";
import { COLOR_GROUPS, type ColorGroupKey } from "@/lib/theme/types";
import { useCz } from "../Customizer";
import { ColorField, Hint, Section } from "../fields";

export function ColorsPanel() {
  const { theme, update } = useCz();
  const [editing, setEditing] = useState<number | null>(null);
  const palette = theme.global_colors;
  return (
    <>
      <div className="cz-block">
        <div className="cz-block-head">
          <strong>Global Colors</strong>
          <span className="cz-block-actions">
            <button
              type="button"
              className="cz-circle"
              title="Add color"
              onClick={() =>
                update((t) => {
                  t.global_colors.push({ slug: `custom-${Date.now().toString(36)}`, name: "Custom", color: "#888888" });
                })
              }
            >
              <i className="fas fa-plus" />
            </button>
          </span>
        </div>
        <div className="cz-gpal">
          {palette.map((g, i) => (
            <button type="button" key={g.slug} className={`cz-gpal-item${editing === i ? " active" : ""}`} style={{ background: g.color }} title={`${g.name} — click to edit`} onClick={() => setEditing(editing === i ? null : i)} />
          ))}
        </div>
        {editing !== null && palette[editing] && (
          <div className="cz-gpal-edit">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(palette[editing].color) ? palette[editing].color : "#000000"} onChange={(e) => update((t) => void (t.global_colors[editing].color = e.target.value))} />
            <input className="cz-gpal-hex" value={palette[editing].color} onChange={(e) => update((t) => void (t.global_colors[editing].color = e.target.value.trim()))} />
            <input className="cz-gpal-name" value={palette[editing].name} onChange={(e) => update((t) => void (t.global_colors[editing].name = e.target.value))} placeholder="Name" />
            {editing > 6 && (
              <button
                type="button"
                className="cz-circle danger"
                title="Delete color"
                onClick={() => {
                  update((t) => void t.global_colors.splice(editing, 1));
                  setEditing(null);
                }}
              >
                <i className="fas fa-trash" />
              </button>
            )}
          </div>
        )}
        <Hint>Colors below can use a global color — change the global color and everything using it updates.</Hint>
      </div>
      {(Object.keys(COLOR_GROUPS) as ColorGroupKey[]).map((g) => (
        <Section key={g} title={COLOR_GROUPS[g].label} defaultOpen={g === "body"}>
          {Object.entries(COLOR_GROUPS[g].fields).map(([f, label]) => (
            <ColorField
              key={f}
              label={label as string}
              palette={palette}
              value={(theme.colors[g] as Record<string, string>)[f] ?? ""}
              onChange={(v) => update((t) => void ((t.colors[g] as Record<string, string>)[f] = v))}
            />
          ))}
        </Section>
      ))}
    </>
  );
}
