"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { MediaLibraryModal, type MediaLibraryItem } from "../MediaLibraryModal";
import { uploadImageFast } from "@/lib/clientUpload";
import { useAdminDialogs } from "../AdminDialogProvider";
import { ButtonBlock, CalloutBlock, EmbedBlock } from "./blocks";

function Btn({ on, active, title, icon, label }: { on: () => void; active?: boolean; title: string; icon?: string; label?: string }) {
  return (
    <button type="button" className={`rte-btn${active ? " is-active" : ""}`} title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={on}>
      {icon ? <i className={`fas ${icon}`} /> : label}
    </button>
  );
}

type BlockDef = { id: string; label: string; icon: string; keywords: string; run: (e: Editor) => void };

/**
 * Block editor for posts and pages — WordPress-style blocks (Paragraph,
 * Heading, List, Quote, Image, Button, Table, Callout, Video, Separator,
 * Code) on a Tiptap document. Insert with the "+" button, the "+" on an
 * empty line, or by typing "/" at the start of an empty line.
 * Saves plain HTML in the form field `name`.
 */
export function BlockEditor({
  name,
  defaultValue,
  minHeight = 460,
  placeholder = "Type / to choose a block, or start writing…",
  onChange,
}: {
  name: string;
  defaultValue?: string;
  minHeight?: number;
  placeholder?: string;
  onChange?: (html: string) => void;
}) {
  const [html, setHtml] = useState(defaultValue ?? "");
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [inserter, setInserter] = useState<{ open: boolean; query: string; slash: boolean }>({ open: false, query: "", slash: false });
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [, force] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { notice } = useAdminDialogs();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4, 5, 6] }, link: { openOnClick: false, autolink: true } }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder, includeChildren: false }),
      ButtonBlock,
      CalloutBlock,
      EmbedBlock,
    ],
    content: defaultValue ?? "",
    editorProps: { attributes: { class: "rte-content be-content entry-content" } },
    onUpdate: ({ editor }) => {
      const next = editor.getHTML();
      setHtml(next);
      onChange?.(next);
      // "/" at the start of an empty paragraph opens the block picker.
      const { $from, empty } = editor.state.selection;
      const text = $from.parent.textContent;
      if (empty && $from.parent.type.name === "paragraph" && text.startsWith("/") && !text.includes(" ")) {
        setInserter({ open: true, query: text.slice(1), slash: true });
      } else if (inserter.slash) {
        setInserter({ open: false, query: "", slash: false });
      }
    },
    onSelectionUpdate: () => force((n) => n + 1),
  });

  useEffect(() => {
    function close(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setInserter((s) => (s.open ? { open: false, query: "", slash: false } : s));
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const blocks: BlockDef[] = useMemo(
    () => [
      { id: "p", label: "Paragraph", icon: "fa-paragraph", keywords: "text paragraph", run: (e) => e.chain().focus().setParagraph().run() },
      { id: "h2", label: "Heading 2", icon: "fa-heading", keywords: "heading title h2", run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
      { id: "h3", label: "Heading 3", icon: "fa-heading", keywords: "heading subtitle h3", run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
      { id: "h4", label: "Heading 4", icon: "fa-heading", keywords: "heading h4", run: (e) => e.chain().focus().setHeading({ level: 4 }).run() },
      { id: "ul", label: "List", icon: "fa-list-ul", keywords: "list bullet unordered", run: (e) => e.chain().focus().toggleBulletList().run() },
      { id: "ol", label: "Numbered List", icon: "fa-list-ol", keywords: "list numbered ordered", run: (e) => e.chain().focus().toggleOrderedList().run() },
      { id: "quote", label: "Quote", icon: "fa-quote-left", keywords: "quote blockquote citation", run: (e) => e.chain().focus().toggleBlockquote().run() },
      { id: "image", label: "Image", icon: "fa-image", keywords: "image photo picture upload", run: () => fileRef.current?.click() },
      { id: "media", label: "From Media Library", icon: "fa-photo-film", keywords: "image media library gallery", run: () => setLibraryOpen(true) },
      {
        id: "button",
        label: "Button",
        icon: "fa-square-arrow-up-right",
        keywords: "button link cta call",
        run: (e) => e.chain().focus().insertContent({ type: "buttonBlock", attrs: { text: "Click here", href: "" } }).run(),
      },
      {
        id: "table",
        label: "Table",
        icon: "fa-table",
        keywords: "table grid rows columns",
        run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
      {
        id: "callout",
        label: "Callout / Notice",
        icon: "fa-circle-info",
        keywords: "callout notice alert info box highlight",
        run: (e) => e.chain().focus().insertContent({ type: "callout", attrs: { variant: "info" }, content: [{ type: "paragraph" }] }).run(),
      },
      { id: "embed", label: "Video (YouTube)", icon: "fa-film", keywords: "video youtube vimeo embed iframe", run: (e) => e.chain().focus().insertContent({ type: "embed" }).run() },
      { id: "hr", label: "Separator", icon: "fa-minus", keywords: "separator divider line hr", run: (e) => e.chain().focus().setHorizontalRule().run() },
      { id: "code", label: "Code", icon: "fa-code", keywords: "code pre snippet", run: (e) => e.chain().focus().toggleCodeBlock().run() },
    ],
    []
  );

  function pick(b: BlockDef) {
    if (!editor) return;
    if (inserter.slash) {
      // Remove the "/query" text the reader typed before inserting.
      const { $from } = editor.state.selection;
      editor.chain().focus().deleteRange({ from: $from.start(), to: $from.end() }).run();
    }
    setInserter({ open: false, query: "", slash: false });
    b.run(editor);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploading(true);
    try {
      const res = await uploadImageFast(file, "post");
      editor.chain().focus().setImage({ src: res.url, alt: file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ") }).run();
    } catch (err) {
      notice(err instanceof Error ? err.message : "Image upload failed.", { type: "error" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function setLink() {
    if (!editor) return;
    const prev = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link URL (leave empty to remove the link)", prev || "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  async function editImageAlt() {
    if (!editor) return;
    const alt = window.prompt("Image alt text (describe the image for Google and screen readers)", (editor.getAttributes("image").alt as string) ?? "");
    if (alt !== null) editor.chain().focus().updateAttributes("image", { alt }).run();
  }

  if (!editor) return <div className="be-wrap" style={{ minHeight }} />;

  const q = inserter.query.toLowerCase();
  // eslint-disable-next-line react-hooks/refs -- fileRef is only read inside click handlers
  const shown = blocks.filter((b) => !q || b.label.toLowerCase().includes(q) || b.keywords.includes(q));
  const blockType = ["2", "3", "4", "5", "6"].find((l) => editor.isActive("heading", { level: Number(l) })) ?? "p";
  const inTable = editor.isActive("table");
  const words = editor.state.doc.textContent.trim() ? editor.state.doc.textContent.trim().split(/\s+/).length : 0;

  return (
    <div className="be-wrap rte-wrap" ref={wrapRef}>
      <div className="rte-toolbar be-toolbar">
        <button type="button" className="be-add" title="Add block" onClick={() => setInserter((s) => ({ open: !s.open, query: "", slash: false }))}>
          <i className="fas fa-plus" />
        </button>
        <select
          className="be-type"
          value={blockType}
          disabled={mode === "html"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setHeading({ level: Number(v) as 2 | 3 | 4 | 5 | 6 }).run();
          }}
          title="Block type"
        >
          <option value="p">Paragraph</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
          <option value="5">Heading 5</option>
          <option value="6">Heading 6</option>
        </select>
        <span className="rte-sep" />
        <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold" icon="fa-bold" />
        <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic" icon="fa-italic" />
        <Btn on={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline" icon="fa-underline" />
        <Btn on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough" icon="fa-strikethrough" />
        <Btn on={setLink} active={editor.isActive("link")} title="Link" icon="fa-link" />
        <span className="rte-sep" />
        <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="List" icon="fa-list-ul" />
        <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list" icon="fa-list-ol" />
        <Btn on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote" icon="fa-quote-left" />
        <span className="rte-sep" />
        <Btn on={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left" icon="fa-align-left" />
        <Btn on={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center" icon="fa-align-center" />
        <Btn on={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right" icon="fa-align-right" />
        <span className="rte-sep" />
        <Btn on={() => fileRef.current?.click()} title="Upload image" icon="fa-image" />
        <Btn on={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table" icon="fa-table" />
        <Btn on={() => editor.chain().focus().undo().run()} title="Undo" icon="fa-rotate-left" />
        <Btn on={() => editor.chain().focus().redo().run()} title="Redo" icon="fa-rotate-right" />
        <div className="be-mode">
          <button type="button" className={mode === "visual" ? "is-active" : ""} onClick={() => setMode("visual")}>
            Visual
          </button>
          <button
            type="button"
            className={mode === "html" ? "is-active" : ""}
            onClick={() => {
              setHtml(editor.getHTML());
              setMode("html");
            }}
          >
            HTML
          </button>
        </div>
      </div>

      {inTable && mode === "visual" && (
        <div className="be-table-bar">
          <span>Table:</span>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row</button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Column</button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>− Row</button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>− Column</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Header row</button>
          <button type="button" onClick={() => editor.chain().focus().mergeOrSplit().run()}>Merge / split</button>
          <button type="button" className="danger" onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</button>
        </div>
      )}

      {inserter.open && (
        <div className="be-inserter" role="dialog" aria-label="Add block">
          {!inserter.slash && (
            <input autoFocus className="be-inserter-search" placeholder="Search blocks" value={inserter.query} onChange={(e) => setInserter((s) => ({ ...s, query: e.target.value }))} />
          )}
          <div className="be-inserter-grid">
            {shown.map((b) => (
              <button type="button" key={b.id} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(b)}>
                <i className={`fas ${b.icon}`} />
                <span>{b.label}</span>
              </button>
            ))}
            {!shown.length && <p className="be-inserter-empty">No blocks found.</p>}
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
      {uploading && <div className="be-uploading">Uploading image…</div>}

      <div style={{ display: mode === "visual" ? "block" : "none" }}>
        <FloatingMenu editor={editor} className="be-float" shouldShow={({ state }) => {
          const { $from, empty } = state.selection;
          return empty && $from.parent.type.name === "paragraph" && $from.parent.content.size === 0 && $from.depth === 1;
        }}>
          <button type="button" className="be-float-add" title="Add block" onClick={() => setInserter({ open: true, query: "", slash: false })}>
            <i className="fas fa-plus" />
          </button>
        </FloatingMenu>
        <BubbleMenu editor={editor} className="be-bubble" shouldShow={({ editor: ed, state }) => !state.selection.empty && !ed.isActive("image") && !ed.isActive("buttonBlock") && !ed.isActive("embed")}>
          <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold" icon="fa-bold" />
          <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic" icon="fa-italic" />
          <Btn on={setLink} active={editor.isActive("link")} title="Link" icon="fa-link" />
          <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2" label="H2" />
          <Btn on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3" label="H3" />
        </BubbleMenu>
        <BubbleMenu editor={editor} className="be-bubble" shouldShow={({ editor: ed }) => ed.isActive("image")}>
          <button type="button" className="rte-btn be-text-btn" onClick={editImageAlt}>
            <i className="fas fa-pen" /> Alt text
          </button>
          <Btn on={() => editor.chain().focus().deleteSelection().run()} title="Remove image" icon="fa-trash" />
        </BubbleMenu>
        <EditorContent editor={editor} style={{ minHeight }} />
      </div>
      {mode === "html" && (
        <textarea
          className="be-html"
          style={{ minHeight }}
          value={html}
          spellCheck={false}
          onChange={(e) => {
            setHtml(e.target.value);
            onChange?.(e.target.value);
            editor.commands.setContent(e.target.value, { emitUpdate: false });
          }}
        />
      )}
      <div className="be-status">
        {words} words · Type <kbd>/</kbd> for blocks
      </div>
      <input type="hidden" name={name} value={mode === "html" ? html : editor.getHTML()} />

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(item: MediaLibraryItem) => {
          editor.chain().focus().setImage({ src: `/${item.path.replace(/^\/+/, "")}`, alt: "" }).run();
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}
