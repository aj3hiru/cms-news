"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- TinyMCE is loaded from the CDN at runtime and ships no types here */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MediaLibraryModal, type MediaLibraryItem } from "../MediaLibraryModal";
import { useAdminDialogs } from "../AdminDialogProvider";
import { uploadImageFast } from "@/lib/clientUpload";
import { fixContentMediaUrls, resolveMediaUrl } from "@/lib/urls";
import { TABLE_TEMPLATES_STYLED, type TableTemplate } from "@/lib/content/tableTemplates";
import { deleteTableTemplate, saveTableTemplate } from "@/lib/content/tableTemplateActions";

const TINYMCE_SRC = "https://cdn.jsdelivr.net/npm/tinymce@7.6.1/tinymce.min.js";

/** Editor look = how the post looks on the website. */
const EDITOR_CSS =
  'html{background:#fff}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:17px;line-height:1.75;color:#373737;padding:20px 22px 40px !important;margin:0 !important;box-sizing:border-box}.mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before{left:22px !important;color:#9ca3af}' +
  "h2{font-size:26px;line-height:1.2;font-weight:600;color:#1d1d1d;margin:1.2em 0 .6em}h3{font-size:22px;line-height:1.2;font-weight:600;color:#1d1d1d;margin:1.1em 0 .5em}h4{font-size:19px;margin:1em 0 .5em}h5,h6{font-size:17px;margin:1em 0 .5em}" +
  "p{margin:0 0 1.2em}img{max-width:100%;height:auto;border-radius:6px}a{color:#7c3aed}" +
  "ul,ol{margin:0 0 1.2em 1.4em;padding-left:1.2em}" +
  "table{border-collapse:collapse;width:100%;margin:0 0 1.2em}th,td{border:1px solid #373737;padding:8.5px;vertical-align:top}th{font-weight:700;background:#f7f7f8}" +
  "blockquote{margin:1.2em 0;padding:12px 16px;border-left:3px solid #7c3aed;background:#f7f7f8;font-style:italic;color:#4b5563}" +
  "hr{border:0;border-top:1px solid #d1d5db;margin:1.2em 0}pre{background:#0f172a;color:#e2e8f0;padding:12px 14px;border-radius:6px;overflow:auto}" +
  "iframe{max-width:100%}.nb-embed iframe{width:100%;aspect-ratio:16/9;height:auto}" +
  ".wp-block-buttons{display:flex;margin:10px 0}.wp-block-buttons.is-content-justification-center{justify-content:center}.wp-block-buttons.is-content-justification-right{justify-content:flex-end}" +
  ".wp-block-button__link{display:inline-block;background:#7c3aed;color:#fff !important;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600}.wp-block-button.is-style-outline .wp-block-button__link{background:transparent;color:#7c3aed !important;border:2px solid #7c3aed}" +
  ".nb-callout{border-left:4px solid #3b82f6;background:#eff6ff;padding:12px 16px;border-radius:6px;margin:0 0 1.2em}.nb-callout--success{border-color:#16a34a;background:#f0fdf4}.nb-callout--danger{border-color:#dc2626;background:#fef2f2}";

declare global {
  interface Window {
    tinymce?: any;
  }
}

let loader: Promise<void> | null = null;
function loadTinyMce(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.tinymce) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = TINYMCE_SRC;
      s.referrerPolicy = "origin";
      s.onload = () => resolve();
      s.onerror = () => {
        loader = null;
        reject(new Error("The editor could not be loaded. Check the internet connection and reload the page."));
      };
      document.head.appendChild(s);
    });
  }
  return loader;
}

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Post editor (WordPress classic editor feel, TinyMCE): Visual / Text tabs, Add Media, a compact toolbar with more tools
 * behind "⋯", WordPress-style tables with their own toolbar and templates. Saves plain HTML in the form field `name`.
 */
export function TinyEditor({ name, defaultValue, minHeight = 560, placeholder = "Start writing your post…", onChange }: { name: string; defaultValue?: string; minHeight?: number; placeholder?: string; onChange?: (html: string) => void }) {
  const [html, setHtml] = useState(defaultValue ?? "");
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [ready, setReady] = useState(false);
  const [more, setMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [tpl, setTpl] = useState<{ open: boolean; target: HTMLTableElement | null }>({ open: false, target: null });
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const edRef = useRef<any>(null);
  const htmlRef = useRef(html);
  const onChangeRef = useRef(onChange);
  const moreRef = useRef(more);
  const pickerCb = useRef<((item: MediaLibraryItem) => void) | null>(null);
  const { notice } = useAdminDialogs();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    moreRef.current = more;
  }, [more]);

  function update(next: string) {
    htmlRef.current = next;
    setHtml(next);
    onChangeRef.current?.(next);
  }

  useEffect(() => {
    let cancelled = false;
    loadTinyMce()
      .then(() => {
        if (cancelled || !areaRef.current || !window.tinymce) return;
        window.tinymce.init({
          target: areaRef.current,
          license_key: "gpl",
          min_height: minHeight,
          placeholder,
          menubar: false,
          plugins: "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code codesample fullscreen insertdatetime media table help wordcount autoresize emoticons nonbreaking pagebreak",
          toolbar:
            "blocks | bold italic underline | bullist numlist | alignleft aligncenter alignright | link image table tabletemplate | moretoggle | blockquote undo redo | strikethrough forecolor backcolor | hr media linkbutton | unlink pastetext removeformat charmap | outdent indent | searchreplace visualblocks code | emoticons pagebreak | fullscreen help",
          toolbar_mode: "wrap",
          toolbar_sticky: false,
          statusbar: true,
          elementpath: true,
          resize: false,
          block_formats: "Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre",
          contextmenu: "link image table",
          autoresize_bottom_margin: 40,
          branding: false,
          promotion: false,
          browser_spellcheck: true,
          entity_encoding: "raw",
          convert_urls: false,
          relative_urls: false,
          extended_valid_elements: "iframe[src|title|width|height|allow|allowfullscreen|frameborder|loading|style|class],div[class|style|data-*],a[href|target|rel|class|style|title|data-*]",
          link_default_protocol: "https",
          link_assume_external_targets: "https",
          link_title: false,
          link_context_toolbar: true,
          link_target_list: [
            { title: "Same window", value: "" },
            { title: "New window", value: "_blank" },
          ],
          link_rel_list: [
            { title: "None", value: "" },
            { title: "nofollow", value: "nofollow" },
            { title: "sponsored nofollow", value: "sponsored nofollow" },
            { title: "noopener noreferrer", value: "noopener noreferrer" },
          ],
          image_caption: true,
          image_description: true,
          image_advtab: true,
          automatic_uploads: true,
          paste_data_images: true,
          images_upload_handler: async (blobInfo: any) => {
            const file = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type });
            const res = await uploadImageFast(file, "post");
            return res.url;
          },
          file_picker_types: "image",
          file_picker_callback: (cb: (url: string, meta?: Record<string, string>) => void, _value: string, meta: { filetype: string }) => {
            if (meta.filetype !== "image") return;
            pickerCb.current = (item) => cb(resolveMediaUrl(item.path), { alt: "" });
            setLibraryOpen(true);
          },
          table_default_styles: { width: "100%" },
          table_responsive_width: true,
          table_advtab: true,
          table_class_list: [
            { title: "Default", value: "" },
            { title: "Stripes", value: "is-style-stripes" },
            { title: "Bordered", value: "is-style-bordered" },
            { title: "Minimal", value: "is-style-minimal" },
          ],
          table_toolbar:
            "tabletplchange | tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablerowheader tablecolheader | tablemergecells tablesplitcells | tablecellbackgroundcolor",
          table_header_type: "sectionCells",
          table_use_colgroups: false,
          table_sizing_mode: "responsive",
          paste_webkit_styles: "color font-weight font-style text-decoration background-color text-align",
          paste_merge_formats: true,
          smart_paste: true,
          content_style: EDITOR_CSS,
          setup: (ed: any) => {
            ed.ui.registry.addToggleButton("moretoggle", {
              icon: "more-drawer",
              tooltip: "Show / hide more tools",
              onAction: (api: any) => {
                const on = !moreRef.current;
                setMore(on);
                api.setActive(on);
                setTimeout(() => ed.dispatch("ResizeEditor"), 0);
              },
            });
            ed.ui.registry.addButton("linkbutton", { text: "Button", tooltip: "Insert / edit link button", onAction: () => openButtonDialog(ed) });
            ed.ui.registry.addButton("tabletemplate", { text: "Templates", tooltip: "Insert a table template", onAction: () => setTpl({ open: true, target: null }) });
            ed.ui.registry.addButton("tabletplchange", {
              text: "Templates",
              icon: "table",
              tooltip: "Change this table to a template design",
              onAction: () => setTpl({ open: true, target: ed.dom.getParent(ed.selection.getNode(), "table") }),
            });
            ed.on("dblclick", (e: MouseEvent) => {
              const t = e.target as HTMLElement | null;
              if (t?.closest?.(".wp-block-buttons")) {
                e.preventDefault();
                openButtonDialog(ed);
              }
            });
            ed.on("init", () => {
              edRef.current = ed;
              ed.setContent(fixContentMediaUrls(htmlRef.current));
              setReady(true);
            });
            ed.on("input change undo redo SetContent ExecCommand", () => {
              if (ed.initialized) update(ed.getContent());
            });
          },
        });
      })
      .catch((e: Error) => setLoadError(e.message));
    return () => {
      cancelled = true;
      if (edRef.current) {
        try {
          edRef.current.remove();
        } catch {
          /* already gone */
        }
        edRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(to: "visual" | "html") {
    if (to === mode) return;
    const ed = edRef.current;
    if (to === "html") {
      if (ed) update(ed.getContent());
    } else if (ed) {
      ed.setContent(htmlRef.current);
    }
    setMode(to);
  }

  function addMedia() {
    if (mode === "html") return notice("Switch to the Visual tab to add media.", { type: "info" });
    pickerCb.current = (item) => edRef.current?.insertContent(`<img src="${escAttr(resolveMediaUrl(item.path))}" alt="">`);
    setLibraryOpen(true);
  }

  return (
    <div ref={wrapRef} className={`te-wrap${more ? " te-more" : ""}${ready ? " te-ready" : ""}`}>
      <div className="be-tabs te-tabs">
        <button type="button" className="te-addmedia" onClick={addMedia}>
          <i className="fas fa-photo-film" /> Add Media
        </button>
        <div className="be-mode">
          <button type="button" className={mode === "visual" ? "is-active" : ""} onClick={() => switchMode("visual")}>
            Visual
          </button>
          <button type="button" className={mode === "html" ? "is-active" : ""} onClick={() => switchMode("html")}>
            Text
          </button>
        </div>
      </div>
      {loadError && <div className="te-error">{loadError}</div>}
      {!ready && !loadError && <div className="te-loading">Loading editor…</div>}
      <div hidden={mode === "html"}>
        <textarea ref={areaRef} defaultValue="" aria-label="Post content" />
      </div>
      {mode === "html" && <textarea className="te-html" spellCheck={false} value={html} onChange={(e) => update(e.target.value)} style={{ minHeight }} aria-label="Post content (HTML)" />}
      <input type="hidden" name={name} value={html} />

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(item: MediaLibraryItem) => {
          pickerCb.current?.(item);
          pickerCb.current = null;
          setLibraryOpen(false);
        }}
      />
      {tpl.open &&
        createPortal(
          <TemplateModal
            target={tpl.target}
            onClose={() => setTpl({ open: false, target: null })}
            onUse={(t, how) => {
              const ed = edRef.current;
              if (!ed) return;
              if (mode === "html") return notice("Switch to the Visual tab to use a template.", { type: "info" });
              const target = tpl.target && ed.getBody().contains(tpl.target) ? tpl.target : null;
              ed.undoManager.transact(() => {
                if (target && how === "design") {
                  if (!applyTemplateDesign(ed, target, t.html)) notice("This template has no table to copy the design from.", { type: "info" });
                } else if (target) {
                  ed.dom.setOuterHTML(target, t.html);
                } else {
                  ed.focus();
                  // never put a table inside another table's cell: with the cursor in a table, the template goes after it
                  let outer: HTMLElement | null = null;
                  let n = ed.selection.getNode();
                  while ((n = ed.dom.getParent(n, "table")) && n !== ed.getBody()) {
                    outer = n;
                    n = n.parentNode;
                  }
                  if (outer) {
                    const para = ed.dom.create("p", {}, '<br data-mce-bogus="1">');
                    ed.dom.insertAfter(para, outer);
                    ed.selection.setCursorLocation(para, 0);
                  }
                  ed.insertContent(`${t.html}<p></p>`);
                }
              });
              ed.nodeChanged();
              update(ed.getContent());
              setTpl({ open: false, target: null });
            }}
            onSaveSelected={async () => {
              const ed = edRef.current;
              const node = ed ? ed.dom.getParent(ed.selection.getNode(), "table") : null;
              if (!node) {
                notice("Click inside a table in the post first, then save it as a template.", { type: "info" });
                return null;
              }
              const nm = window.prompt("Template name");
              if (!nm) return null;
              const r = await saveTableTemplate(nm, node.outerHTML);
              if (!r.ok) {
                notice(r.error ?? "Could not save.", { type: "error" });
                return null;
              }
              notice("Template saved.", { type: "success" });
              return r.template ?? null;
            }}
          />,
          document.body
        )}
    </div>
  );
}

/** Gives `table` the look of the template's first table: table, header-cell, cell and first-column styles. Text stays. */
function applyTemplateDesign(ed: any, table: HTMLTableElement, tplHtml: string): boolean {
  const box = document.createElement("div");
  box.innerHTML = tplHtml;
  const t = box.querySelector("table");
  if (!t) return false;
  const cols = Math.max(...[...t.rows].map((r) => r.cells.length));
  const ths = [...t.querySelectorAll("th")];
  const colTh = ths.find((c) => (c.colSpan || 1) < cols) || ths[0] || null;
  const capTh = ths.find((c) => (c.colSpan || 1) >= cols && cols > 1) || null;
  const tds = [...t.querySelectorAll("td")];
  const body = tds.find((c) => c.cellIndex > 0) || tds[0] || null;
  const first = tds.find((c) => c.cellIndex === 0) || null;
  const firstDiffers = Boolean(first && body && first.getAttribute("style") !== body.getAttribute("style"));
  const set = (el: Element, src: Element | null) => {
    const st = src?.getAttribute("style");
    if (st) ed.dom.setAttrib(el, "style", st);
  };
  const tcols = Math.max(...[...table.rows].map((r) => r.cells.length));
  set(table, t);
  ed.dom.setAttrib(table, "data-mce-style", null);
  [...table.rows].forEach((r) =>
    [...r.cells].forEach((c) => {
      if (c.nodeName === "TH") set(c, capTh && (c.colSpan || 1) >= tcols && tcols > 1 ? capTh : colTh || capTh);
      else set(c, firstDiffers && c.cellIndex === 0 ? first : body);
      ed.dom.setAttrib(c, "data-mce-style", null);
    })
  );
  if (!table.querySelector("th") && colTh && table.rows[0]) [...table.rows[0].cells].forEach((c) => set(c, colTh));
  return true;
}

function TemplateModal({
  target,
  onClose,
  onUse,
  onSaveSelected,
}: {
  target: HTMLTableElement | null;
  onClose: () => void;
  onUse: (t: TableTemplate, how: "design" | "replace") => void;
  onSaveSelected: () => Promise<TableTemplate | null>;
}) {
  const [how, setHow] = useState<"design" | "replace">("design");
  const [custom, setCustom] = useState<TableTemplate[] | null>(null);
  useEffect(() => {
    import("@/lib/content/tableTemplateActions").then((m) => m.listCustomTableTemplates().then(setCustom)).catch(() => setCustom([]));
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  const list = [...TABLE_TEMPLATES_STYLED.map((t) => ({ ...t, mine: false })), ...(custom ?? []).map((t) => ({ ...t, mine: true }))];
  return (
    <div className="te-tpl-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="te-tpl" role="dialog" aria-label="Table templates">
        <div className="te-tpl-head">
          <h2>{target ? "Change this table to a template" : "Table Templates"}</h2>
          <div className="te-tpl-head-r">
            <button
              type="button"
              className="rm-btn"
              onClick={async () => {
                const t = await onSaveSelected();
                if (t) setCustom((c) => [...(c ?? []), t]);
              }}
              title="Click inside a table in the post first"
            >
              <i className="fas fa-floppy-disk" /> Save selected table as template
            </button>
            <button type="button" className="te-tpl-x" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>
        <div className="te-tpl-body">
          {target && (
            <div className="tpl-target">
              <label>
                <input type="radio" checked={how === "design"} onChange={() => setHow("design")} /> <b>Change only the design</b> — this table keeps its text, rows and columns, and gets the colours and style of the template you pick
              </label>
              <label>
                <input type="radio" checked={how === "replace"} onChange={() => setHow("replace")} /> <b>Replace this table</b> with the template (its text is replaced too)
              </label>
            </div>
          )}
          <div className="te-tpl-grid">
            {list.map((t) => (
              <div key={t.id} className="te-tpl-card" onClick={() => onUse(t, how)}>
                <div className="te-tpl-prev" dangerouslySetInnerHTML={{ __html: t.html }} />
                <div className="te-tpl-info">
                  <h4>
                    {t.name}
                    {t.mine && <small> (yours)</small>}
                  </h4>
                  <div className="te-tpl-btns">
                    <button type="button" className="te-tpl-use">
                      <i className={`fas ${target ? "fa-check" : "fa-plus"}`} /> {target ? "Apply" : "Insert"}
                    </button>
                    {t.mine && (
                      <button
                        type="button"
                        className="te-tpl-del"
                        title="Delete this template"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm("Delete this template? Posts that already use it are not changed.")) return;
                          const r = await deleteTableTemplate(t.id);
                          if (r.ok) setCustom((c) => (c ?? []).filter((x) => x.id !== t.id));
                        }}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function openButtonDialog(ed: any) {
  const found: HTMLElement | null = ed.selection.getNode()?.closest?.(".wp-block-buttons") ?? null;
  const a = found?.querySelector("a");
  const align = /is-content-justification-(left|center|right)/.exec(found?.className ?? "")?.[1] ?? "center";
  ed.windowManager.open({
    title: "Link Button",
    size: "normal",
    initialData: {
      text: a?.textContent ?? "Click here",
      url: a?.getAttribute("href") ?? "https://",
      align,
      variant: found?.querySelector(".is-style-outline") ? "outline" : "fill",
      newtab: a ? a.getAttribute("target") === "_blank" : true,
      nofollow: /nofollow/.test(a?.getAttribute("rel") ?? ""),
    },
    body: {
      type: "panel",
      items: [
        { type: "input", name: "text", label: "Button text" },
        { type: "input", name: "url", label: "URL" },
        {
          type: "selectbox",
          name: "align",
          label: "Alignment",
          items: [
            { value: "left", text: "Left" },
            { value: "center", text: "Center" },
            { value: "right", text: "Right" },
          ],
        },
        {
          type: "selectbox",
          name: "variant",
          label: "Style",
          items: [
            { value: "fill", text: "Filled" },
            { value: "outline", text: "Outline" },
          ],
        },
        { type: "checkbox", name: "newtab", label: "Open in a new tab" },
        { type: "checkbox", name: "nofollow", label: 'Add rel="nofollow"' },
      ],
    },
    buttons: [
      { type: "cancel", text: "Cancel" },
      { type: "submit", text: found ? "Update button" : "Insert button", buttonType: "primary" },
    ],
    onSubmit: (api: any) => {
      const v = api.getData();
      const text = (v.text || "").trim() || "Click here";
      const url = (v.url || "").trim() || "#";
      const rel = [v.newtab ? "noopener" : "", v.nofollow ? "nofollow" : ""].filter(Boolean).join(" ");
      const html = `<div class="wp-block-buttons is-content-justification-${v.align}"><div class="wp-block-button is-style-${v.variant}"><a class="wp-block-button__link" href="${escAttr(url)}"${v.newtab ? ' target="_blank"' : ""}${rel ? ` rel="${rel}"` : ""}>${escAttr(text)}</a></div></div>`;
      if (found) ed.selection.select(found);
      ed.insertContent(html);
      api.close();
    },
  });
}
