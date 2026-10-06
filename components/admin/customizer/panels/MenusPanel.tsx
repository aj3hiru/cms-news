"use client";

import { useEffect, useRef, useState } from "react";
import type { MenuLink } from "@/lib/theme/types";
import { getMenuSources, type MenuSource } from "@/lib/theme/actions";
import { useCz } from "../Customizer";
import { Hint, Segmented } from "../fields";

type MenuId = "primary" | "strip";

/** Menus — like the WordPress customizer: pick a menu, edit its items, "Add Items" panel. */
export function MenusPanel() {
  const { theme, update } = useCz();
  const [menu, setMenu] = useState<MenuId | null>(null);
  const items = menu === "strip" ? theme.header.strip_items : theme.header.menu;
  const setItems = (v: MenuLink[]) =>
    update((t) => {
      if (menu === "strip") t.header.strip_items = v;
      else t.header.menu = v;
    });

  if (!menu) {
    return (
      <>
        <Hint>Menus are lists of links shown in the header. Pick a menu to add, remove or reorder its links.</Hint>
        <div className="cz-menu-cards">
          <button type="button" onClick={() => setMenu("primary")}>
            <i className="fas fa-bars" />
            <span>
              <strong>Primary Menu</strong>
              <small>
                {theme.header.menu.length} items · Header{theme.header.template === "classic" ? " (desktop)" : ""} and the mobile menu
              </small>
            </span>
            <i className="fas fa-chevron-right" />
          </button>
          <button type="button" onClick={() => setMenu("strip")}>
            <i className="fas fa-grip-lines" />
            <span>
              <strong>Menu Strip</strong>
              <small>{theme.header.strip_source === "categories" ? "All categories (automatic)" : `${theme.header.strip_items.length} items`} · Row below the header</small>
            </span>
            <i className="fas fa-chevron-right" />
          </button>
        </div>
        <div className="cz-block">
          <div className="cz-block-head">
            <strong>Menu Locations</strong>
          </div>
          <Hint>Primary Menu → main navigation (Classic header) and the mobile slide-out menu. Menu Strip → the scrolling row under the header (and the main row of the Racing Zone header).</Hint>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="cz-subhead">
        <button type="button" className="cz-link-btn" onClick={() => setMenu(null)}>
          <i className="fas fa-arrow-left" /> All menus
        </button>
        <strong>{menu === "strip" ? "Menu Strip" : "Primary Menu"}</strong>
      </div>
      {menu === "strip" && (
        <div className="cz-block">
          <Segmented
            label="Links in the strip"
            value={theme.header.strip_source}
            onChange={(v) => update((t) => void (t.header.strip_source = v))}
            options={[
              ["categories", "All categories", "fa-folder-tree"],
              ["custom", "Custom menu", "fa-list"],
            ]}
          />
          <label className="cz-toggle">
            <span className="cz-toggle-text">Show the menu strip</span>
            <input type="checkbox" checked={theme.header.strip} onChange={(e) => update((t) => void (t.header.strip = e.target.checked))} />
            <span className="cz-switch" aria-hidden="true" />
          </label>
          <Segmented
            label="Style"
            value={theme.header.strip_style}
            onChange={(v) => update((t) => void (t.header.strip_style = v))}
            options={[
              ["plain", "Plain"],
              ["pills", "Pills"],
              ["underline", "Underline"],
            ]}
          />
          <Segmented
            label="Alignment (desktop)"
            value={theme.header.strip_align}
            onChange={(v) => update((t) => void (t.header.strip_align = v))}
            options={[
              ["left", "Left", "fa-align-left"],
              ["center", "Center", "fa-align-center"],
            ]}
          />
        </div>
      )}
      {(menu === "primary" || theme.header.strip_source === "custom") && <MenuEditor items={items} onChange={setItems} nested={menu === "primary"} />}
      {menu === "strip" && theme.header.strip_source === "categories" && <Hint>Every category is listed automatically, newest categories included. Switch to “Custom menu” to choose the links yourself.</Hint>}
    </>
  );
}

function kindOf(url: string): string {
  if (/^https?:\/\//.test(url)) return "Custom Link";
  if (url === "/") return "Front Page";
  if (url.startsWith("/categories/")) return "Category";
  if (url === "/categories") return "Archive";
  if (url.startsWith("/tag/")) return "Tag";
  if (url.startsWith("/page/")) return "Page";
  return "Link";
}

/** The items list: drag to reorder, expand to edit, move under/out of the item above. */
export function MenuEditor({ items, onChange, nested }: { items: MenuLink[]; onChange: (v: MenuLink[]) => void; nested: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const setItem = (i: number, patch: Partial<MenuLink>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const setChild = (i: number, j: number, patch: Partial<MenuLink>) =>
    onChange(items.map((it, k) => (k === i ? { ...it, children: (it.children ?? []).map((c, m) => (m === j ? { ...c, ...patch } : c)) } : it)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const indent = (i: number) => {
    if (i === 0) return;
    const n = [...items];
    const [it] = n.splice(i, 1);
    const parent = { ...n[i - 1], children: [...(n[i - 1].children ?? []), { label: it.label, url: it.url, newTab: it.newTab }, ...(it.children ?? [])] };
    n[i - 1] = parent;
    onChange(n);
  };
  const outdent = (i: number, j: number) => {
    const n = [...items];
    const parent = { ...n[i], children: [...(n[i].children ?? [])] };
    const [child] = parent.children.splice(j, 1);
    n[i] = parent;
    n.splice(i + 1, 0, child);
    onChange(n);
  };
  const add = (it: MenuLink) => onChange([...items, it]);

  return (
    <>
      <div className="cz-menu-items">
        {items.length === 0 && <Hint>Time to add some links! Click “Add Items” to start putting pages, categories, and custom links in your menu.</Hint>}
        {items.map((it, i) => (
          <div
            key={i}
            className={`cz-mi-wrap${over === i ? " drag-over" : ""}`}
            draggable
            onDragStart={() => (drag.current = i)}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              const from = drag.current;
              setOver(null);
              drag.current = null;
              if (from === null || from === i) return;
              const n = [...items];
              const [m] = n.splice(from, 1);
              n.splice(i, 0, m);
              onChange(n);
            }}
          >
            <MenuItemRow
              item={it}
              open={open === `${i}`}
              onToggle={() => setOpen(open === `${i}` ? null : `${i}`)}
              onChange={(p) => setItem(i, p)}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
              actions={
                <>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                    Up one
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                    Down one
                  </button>
                  {nested && i > 0 && (
                    <button type="button" onClick={() => indent(i)}>
                      Under {items[i - 1].label || "previous"}
                    </button>
                  )}
                </>
              }
            />
            {(it.children ?? []).map((c, j) => (
              <div className="cz-mi-child" key={j}>
                <MenuItemRow
                  item={c}
                  open={open === `${i}-${j}`}
                  onToggle={() => setOpen(open === `${i}-${j}` ? null : `${i}-${j}`)}
                  onChange={(p) => setChild(i, j, p)}
                  onRemove={() => onChange(items.map((x, k) => (k === i ? { ...x, children: (x.children ?? []).filter((_, m) => m !== j) } : x)))}
                  actions={
                    <button type="button" onClick={() => outdent(i, j)}>
                      Out from under {it.label || "parent"}
                    </button>
                  }
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="cz-menu-foot">
        <button type="button" className={`cz-btn-outline cz-add-items${adding ? " active" : ""}`} onClick={() => setAdding((a) => !a)}>
          <i className={`fas ${adding ? "fa-xmark" : "fa-plus"}`} /> Add Items
        </button>
        <span className="cz-hint">Drag items to reorder.</span>
      </div>
      {adding && <AddItemsPanel onAdd={add} onClose={() => setAdding(false)} />}
    </>
  );
}

function MenuItemRow({
  item,
  open,
  onToggle,
  onChange,
  onRemove,
  actions,
}: {
  item: MenuLink;
  open: boolean;
  onToggle: () => void;
  onChange: (p: Partial<MenuLink>) => void;
  onRemove: () => void;
  actions: React.ReactNode;
}) {
  return (
    <div className={`cz-mi${open ? " open" : ""}`}>
      <button type="button" className="cz-mi-head" onClick={onToggle}>
        <i className="fas fa-grip-vertical cz-mi-grip" aria-hidden="true" />
        <span className="cz-mi-title">{item.label || "(no label)"}</span>
        <span className="cz-mi-kind">{kindOf(item.url)}</span>
        <i className={`fas fa-caret-${open ? "up" : "down"}`} />
      </button>
      {open && (
        <div className="cz-mi-body">
          <label className="cz-field">
            <span className="cz-label">Navigation Label</span>
            <input value={item.label} onChange={(e) => onChange({ label: e.target.value })} />
          </label>
          <label className="cz-field">
            <span className="cz-label">URL</span>
            <input value={item.url} onChange={(e) => onChange({ url: e.target.value })} />
          </label>
          <label className="cz-check">
            <input type="checkbox" checked={Boolean(item.newTab)} onChange={(e) => onChange({ newTab: e.target.checked })} /> Open link in a new tab
          </label>
          <div className="cz-mi-move">
            <span>Move</span>
            {actions}
          </div>
          <button type="button" className="cz-mi-remove" onClick={onRemove}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

/** Slide-out "Add Items" panel (over the preview), like WP. */
function AddItemsPanel({ onAdd, onClose }: { onAdd: (it: MenuLink) => void; onClose: () => void }) {
  const [section, setSection] = useState<"custom" | "pages" | "posts" | "categories" | "tags" | null>("pages");
  const [q, setQ] = useState("");
  const [lists, setLists] = useState<Record<string, MenuSource[]>>({});
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!section || section === "custom") return;
    const t = setTimeout(() => getMenuSources(section, q).then((r) => setLists((l) => ({ ...l, [section]: r }))), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [section, q]);

  function addOne(s: MenuSource) {
    onAdd({ label: s.label, url: s.url });
    setAdded(s.url + s.label);
    setTimeout(() => setAdded(null), 900);
  }

  return (
    <div className="cz-additems" role="dialog" aria-label="Add menu items">
      <div className="cz-additems-head">
        <span>Add Menu Items</span>
        <button type="button" onClick={onClose} aria-label="Close">
          <i className="fas fa-xmark" />
        </button>
      </div>
      <label className="cz-additems-search">
        <span>Search Menu Items</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
      </label>
      {(
        [
          ["custom", "Custom Links"],
          ["pages", "Pages"],
          ["posts", "Posts"],
          ["categories", "Categories"],
          ["tags", "Tags"],
        ] as const
      ).map(([id, label]) => (
        <div key={id} className={`cz-ai-sec${section === id ? " open" : ""}`}>
          <button type="button" className="cz-ai-head" onClick={() => setSection(section === id ? null : id)}>
            {label}
            <i className={`fas fa-caret-${section === id ? "up" : "down"}`} />
          </button>
          {section === id &&
            (id === "custom" ? (
              <div className="cz-ai-custom">
                <label>
                  URL
                  <input value={url} onChange={(e) => setUrl(e.target.value)} />
                </label>
                <label>
                  Link Text
                  <input value={text} onChange={(e) => setText(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="cz-btn-outline"
                  disabled={!text.trim() || !url.trim() || url === "https://"}
                  onClick={() => {
                    onAdd({ label: text.trim(), url: url.trim() });
                    setText("");
                    setUrl("https://");
                  }}
                >
                  <i className="fas fa-plus" /> Add to Menu
                </button>
              </div>
            ) : (
              <div className="cz-ai-list">
                {(lists[id] ?? []).map((s, i) => (
                  <button type="button" key={i} onClick={() => addOne(s)} className={added === s.url + s.label ? "is-added" : ""}>
                    <i className={`fas ${added === s.url + s.label ? "fa-check" : "fa-plus"}`} />
                    <span>{s.label}</span>
                    <em>{s.kind}</em>
                  </button>
                ))}
                {lists[id] && !lists[id].length && <p className="cz-hint">No results.</p>}
                {!lists[id] && <p className="cz-hint">Loading…</p>}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
