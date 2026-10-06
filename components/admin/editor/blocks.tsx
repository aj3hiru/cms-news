"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

/* ── Button block ────────────────────────────────────────────────
   Saved as WordPress button markup so it renders the same everywhere:
   <div class="wp-block-buttons is-content-justification-left">
     <div class="wp-block-button is-style-fill"><a class="wp-block-button__link" href="…">Label</a></div>
   </div> */

function ButtonView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { text, href, align, variant, newTab } = node.attrs as { text: string; href: string; align: string; variant: string; newTab: boolean };
  return (
    <NodeViewWrapper className={`be-button-block${selected ? " is-selected" : ""}`} data-align={align} contentEditable={false}>
      <div className={`wp-block-buttons is-content-justification-${align}`}>
        <div className={`wp-block-button is-style-${variant}`}>
          <span className="wp-block-button__link" role="textbox">
            <input
              className="be-button-label"
              value={text}
              placeholder="Button text"
              onChange={(e) => updateAttributes({ text: e.target.value })}
              size={Math.max(6, text.length)}
            />
          </span>
        </div>
      </div>
      <div className="be-inline-settings">
        <input type="url" value={href} placeholder="https://link…" onChange={(e) => updateAttributes({ href: e.target.value })} />
        <select value={align} onChange={(e) => updateAttributes({ align: e.target.value })} title="Alignment">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
        <select value={variant} onChange={(e) => updateAttributes({ variant: e.target.value })} title="Style">
          <option value="fill">Fill</option>
          <option value="outline">Outline</option>
        </select>
        <label>
          <input type="checkbox" checked={newTab} onChange={(e) => updateAttributes({ newTab: e.target.checked })} /> New tab
        </label>
        <button type="button" onClick={deleteNode} title="Remove block" className="be-icon-btn">
          <i className="fas fa-trash" />
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const ButtonBlock = Node.create({
  name: "buttonBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      text: { default: "Click here" },
      href: { default: "" },
      align: { default: "left" },
      variant: { default: "fill" },
      newTab: { default: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div.wp-block-buttons",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          const a = e.querySelector("a");
          const align = /is-content-justification-(left|center|right)/.exec(e.className)?.[1] ?? "left";
          return {
            text: a?.textContent ?? "Click here",
            href: a?.getAttribute("href") ?? "",
            align,
            variant: e.querySelector(".is-style-outline") ? "outline" : "fill",
            newTab: a?.getAttribute("target") === "_blank",
          };
        },
      },
    ];
  },
  renderHTML({ node }) {
    const { text, href, align, variant, newTab } = node.attrs;
    return [
      "div",
      { class: `wp-block-buttons is-content-justification-${align}` },
      [
        "div",
        { class: `wp-block-button is-style-${variant}` },
        ["a", { class: "wp-block-button__link", href: href || "#", ...(newTab ? { target: "_blank", rel: "noopener" } : {}) }, text || "Click here"],
      ],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ButtonView);
  },
});

/* ── Callout / notice box ── */

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const variant = node.attrs.variant as string;
  return (
    <NodeViewWrapper className={`nb-callout nb-callout--${variant} be-callout`}>
      <select contentEditable={false} className="be-callout-type" value={variant} onChange={(e) => updateAttributes({ variant: e.target.value })}>
        <option value="note">Note</option>
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="danger">Warning</option>
      </select>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

export const CalloutBlock = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { variant: { default: "note" } };
  },
  parseHTML() {
    return [
      {
        tag: "div.nb-callout",
        getAttrs: (el) => ({ variant: /nb-callout--(\w+)/.exec((el as HTMLElement).className)?.[1] ?? "note" }),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: `nb-callout nb-callout--${node.attrs.variant}` }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});

/* ── Video embed (YouTube / Vimeo / any iframe URL) ── */

export function embedSrc(url: string): string {
  const u = url.trim();
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(u);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = /vimeo\.com\/(\d+)/.exec(u);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return /^https:\/\//.test(u) ? u : "";
}

function EmbedView({ node, updateAttributes, selected }: NodeViewProps) {
  const src = node.attrs.src as string;
  return (
    <NodeViewWrapper className={`be-embed${selected ? " is-selected" : ""}`} contentEditable={false}>
      {src ? (
        <div className="nb-embed">
          <iframe src={src} title="Embedded video" loading="lazy" allowFullScreen />
        </div>
      ) : (
        <div className="be-embed-empty">
          <i className="fas fa-film" /> Paste a YouTube or Vimeo link
        </div>
      )}
      <input
        type="url"
        defaultValue={node.attrs.url as string}
        placeholder="https://www.youtube.com/watch?v=…"
        onBlur={(e) => updateAttributes({ url: e.target.value, src: embedSrc(e.target.value) })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = (e.target as HTMLInputElement).value;
            updateAttributes({ url: v, src: embedSrc(v) });
          }
        }}
      />
    </NodeViewWrapper>
  );
}

export const EmbedBlock = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { url: { default: "" }, src: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "div.nb-embed",
        getAttrs: (el) => {
          const src = (el as HTMLElement).querySelector("iframe")?.getAttribute("src") ?? "";
          return { src, url: src };
        },
      },
    ];
  },
  renderHTML({ node }) {
    return ["div", { class: "nb-embed" }, ["iframe", { src: node.attrs.src, loading: "lazy", allowfullscreen: "true", title: "Embedded video" }]];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
});
