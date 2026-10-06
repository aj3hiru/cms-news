"use client";

import { useEffect, useState } from "react";
import type { AlsoReadGroup, AlsoReadStyle } from "@/lib/theme/types";
import { getPostTitles, searchPostsBrief } from "@/lib/theme/actions";
import { useCz } from "../Customizer";
import { CircleBtn, Hint, Range, Segmented, Text, Toggle } from "../fields";

const STYLES: { v: AlsoReadStyle; label: string; desc: string }[] = [
  { v: "card", label: "Embed card", desc: "Image, title, excerpt. Several posts = swipe slider with a position bar." },
  { v: "accent", label: "Highlight bar", desc: "Colored box with the post titles listed." },
  { v: "minimal", label: "Minimal line", desc: "Simple list of titles between two lines." },
];

export function AlsoReadPanel() {
  const { theme, update, previewPath } = useCz();
  const groups = theme.post.also_read_groups;
  const [open, setOpen] = useState<string | null>(groups[0]?.id ?? null);
  const [titles, setTitles] = useState<Record<number, string>>({});

  useEffect(() => previewPath("/admin/customize/latest-post"), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ids = [...new Set(groups.flatMap((g) => g.post_ids))].filter((id) => !titles[id]);
    if (ids.length) getPostTitles(ids).then((t) => setTitles((x) => ({ ...x, ...t })));
  }, [groups]); // eslint-disable-line react-hooks/exhaustive-deps

  const setGroup = (id: string, patch: Partial<AlsoReadGroup>) =>
    update((t) => {
      t.post.also_read_groups = t.post.also_read_groups.map((g) => (g.id === id ? { ...g, ...patch } : g));
    });

  function addGroup() {
    const last = groups[groups.length - 1];
    const g: AlsoReadGroup = { id: `ar${Date.now().toString(36)}`, after: (last?.after ?? 0) + 4, count: 3, source: "category", post_ids: [], style: "card", label: "Also Read" };
    update((t) => void t.post.also_read_groups.push(g));
    setOpen(g.id);
  }

  return (
    <>
      <Toggle label="Show “Also Read” boxes inside articles" checked={theme.post.also_read} onChange={(v) => update((t) => void (t.post.also_read = v))} />
      <Hint>Each box appears after the paragraph you choose and holds all of its posts in one container. A paragraph number larger than the article is skipped.</Hint>
      {groups.map((g, i) => (
        <div className={`cz-item cz-ar${open === g.id ? " open" : ""}`} key={g.id}>
          <div className="cz-item-row">
            <span className="cz-item-title">
              Box {i + 1}: after paragraph {g.after} · {g.count} post{g.count === 1 ? "" : "s"} · {STYLES.find((s) => s.v === g.style)?.label}
            </span>
            <CircleBtn icon={open === g.id ? "fa-chevron-up" : "fa-chevron-down"} title="Edit" onClick={() => setOpen(open === g.id ? null : g.id)} />
            <CircleBtn
              icon="fa-trash-can"
              title="Delete box"
              danger
              onClick={() =>
                update((t) => {
                  t.post.also_read_groups = t.post.also_read_groups.filter((x) => x.id !== g.id);
                })
              }
            />
          </div>
          {open === g.id && (
            <div className="cz-item-card">
              <Range label="Show after paragraph" min={1} max={40} value={g.after} onChange={(v) => setGroup(g.id, { after: v })} />
              <Text label="Label" value={g.label} onChange={(v) => setGroup(g.id, { label: v })} />
              <Segmented
                label="Which posts"
                value={g.source}
                onChange={(v) => setGroup(g.id, { source: v })}
                options={[
                  ["category", "Same category"],
                  ["latest", "Latest"],
                  ["manual", "Pick posts"],
                ]}
              />
              {g.source === "manual" ? (
                <PostPicker ids={g.post_ids} titles={titles} onChange={(ids, t) => (setTitles((x) => ({ ...x, ...t })), setGroup(g.id, { post_ids: ids, count: Math.max(1, ids.length) }))} />
              ) : (
                <Range label="Number of posts" min={1} max={12} value={g.count} onChange={(v) => setGroup(g.id, { count: v })} />
              )}
              <span className="cz-label">Design</span>
              <div className="cz-also">
                {STYLES.map((s) => (
                  <button type="button" key={s.v} className={`cz-also-opt${g.style === s.v ? " active" : ""}`} onClick={() => setGroup(g.id, { style: s.v })}>
                    <span className={`cz-also-demo cz-also-demo--${s.v}`} aria-hidden="true">
                      <i />
                      <b />
                      <u />
                    </span>
                    <strong>{s.label}</strong>
                    <small>{s.desc}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <button type="button" className="cz-btn-primary" onClick={addGroup}>
        <i className="fas fa-plus" /> Add “Also Read” box
      </button>
    </>
  );
}

function PostPicker({ ids, titles, onChange }: { ids: number[]; titles: Record<number, string>; onChange: (ids: number[], titles: Record<number, string>) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: number; title: string }[]>([]);
  useEffect(() => {
    const t = setTimeout(() => searchPostsBrief(q).then(setHits), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="cz-field">
      <span className="cz-label">Posts ({ids.length})</span>
      <div className="cz-picked">
        {ids.map((id, i) => (
          <div key={id} className="cz-picked-item">
            <span>{titles[id] ?? `Post #${id}`}</span>
            <button type="button" onClick={() => i > 0 && onChange(ids.map((x, j) => (j === i - 1 ? id : j === i ? ids[i - 1] : x)), {})} disabled={i === 0} title="Move up">
              <i className="fas fa-arrow-up" />
            </button>
            <button type="button" onClick={() => onChange(ids.filter((x) => x !== id), {})} title="Remove">
              <i className="fas fa-xmark" />
            </button>
          </div>
        ))}
      </div>
      <input value={q} placeholder="Search posts to add…" onChange={(e) => setQ(e.target.value)} />
      <div className="cz-ai-list cz-ai-list--compact">
        {hits
          .filter((h) => !ids.includes(h.id))
          .slice(0, 8)
          .map((h) => (
            <button type="button" key={h.id} onClick={() => onChange([...ids, h.id], { [h.id]: h.title })}>
              <i className="fas fa-plus" />
              <span>{h.title}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
