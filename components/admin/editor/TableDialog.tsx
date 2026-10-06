"use client";

import { useState } from "react";

export type TableStyle = "default" | "stripes" | "bordered" | "minimal";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Ready-made tables for news posts (exam dates, fees, vacancies, comparisons…). */
export const TABLE_TEMPLATES: { id: string; name: string; icon: string; head: string[]; rows: string[][]; firstColHeader?: boolean }[] = [
  { id: "dates", name: "Important Dates", icon: "fa-calendar-days", head: ["Event", "Date"], rows: [["Application starts", ""], ["Last date to apply", ""], ["Admit card", ""], ["Exam date", ""], ["Result", ""]] },
  { id: "fees", name: "Application Fee", icon: "fa-indian-rupee-sign", head: ["Category", "Fee"], rows: [["General / OBC", ""], ["SC / ST", ""], ["Women", ""], ["Payment mode", "Online"]] },
  { id: "overview", name: "Overview (key : value)", icon: "fa-table-list", head: [], rows: [["Organisation", ""], ["Post name", ""], ["Total posts", ""], ["Apply mode", "Online"], ["Official website", ""]], firstColHeader: true },
  { id: "vacancy", name: "Vacancy Details", icon: "fa-users", head: ["Post Name", "Total", "Qualification"], rows: [["", "", ""], ["", "", ""], ["", "", ""]] },
  { id: "age", name: "Age Limit", icon: "fa-user-clock", head: ["Category", "Minimum", "Maximum"], rows: [["General", "", ""], ["OBC", "", ""], ["SC / ST", "", ""]] },
  { id: "links", name: "Important Links", icon: "fa-link", head: ["Link", "Click here"], rows: [["Apply Online", ""], ["Official Notification", ""], ["Official Website", ""]] },
  { id: "compare", name: "Comparison", icon: "fa-scale-balanced", head: ["Feature", "Option A", "Option B"], rows: [["", "", ""], ["", "", ""], ["", "", ""]] },
  { id: "schedule", name: "Schedule / Timetable", icon: "fa-clock", head: ["Day", "Time", "Details"], rows: [["", "", ""], ["", "", ""], ["", "", ""]] },
];

export function tableHtml(head: string[], rows: string[][], opts: { style: TableStyle; firstColHeader?: boolean }): string {
  const cls = opts.style === "default" ? "" : ` class="is-style-${opts.style}"`;
  const thead = head.length ? `<tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>` : "";
  const body = rows
    .map((r) => `<tr>${r.map((c, i) => (i === 0 && opts.firstColHeader ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join("")}</tr>`)
    .join("");
  return `<table${cls}><tbody>${thead}${body}</tbody></table><p></p>`;
}

/** "Insert table" dialog: custom size with header options (like the WP table block) or a template. */
export function TableDialog({ onInsert, onClose }: { onInsert: (html: string) => void; onClose: () => void }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [headRow, setHeadRow] = useState(true);
  const [headCol, setHeadCol] = useState(false);
  const [style, setStyle] = useState<TableStyle>("default");

  function custom() {
    const head = headRow ? Array.from({ length: cols }, (_, i) => `Heading ${i + 1}`) : [];
    const body = Array.from({ length: Math.max(1, rows - (headRow ? 1 : 0)) }, () => Array.from({ length: cols }, () => ""));
    onInsert(tableHtml(head, body, { style, firstColHeader: headCol }));
  }

  return (
    <div className="be-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="be-modal" role="dialog" aria-label="Insert table">
        <div className="be-modal-head">
          <h3>
            <i className="fas fa-table" /> Insert table
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <i className="fas fa-xmark" />
          </button>
        </div>
        <div className="be-modal-body">
          <div className="be-table-custom">
            <label>
              Columns
              <input type="number" min={1} max={10} value={cols} onChange={(e) => setCols(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
            </label>
            <label>
              Rows
              <input type="number" min={1} max={50} value={rows} onChange={(e) => setRows(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
            </label>
            <label className="be-check">
              <input type="checkbox" checked={headRow} onChange={(e) => setHeadRow(e.target.checked)} /> Header row
            </label>
            <label className="be-check">
              <input type="checkbox" checked={headCol} onChange={(e) => setHeadCol(e.target.checked)} /> Header column
            </label>
          </div>
          <div className="be-table-styles">
            <span>Style</span>
            {(["default", "stripes", "bordered", "minimal"] as TableStyle[]).map((s) => (
              <button type="button" key={s} className={style === s ? "active" : ""} onClick={() => setStyle(s)}>
                <span className={`be-ts be-ts--${s}`}>
                  <i />
                  <i />
                  <i />
                </span>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" className="be-primary" onClick={custom}>
            Create table
          </button>
          <div className="be-templates-title">Or start from a template</div>
          <div className="be-templates">
            {TABLE_TEMPLATES.map((t) => (
              <button type="button" key={t.id} onClick={() => onInsert(tableHtml(t.head, t.rows, { style, firstColHeader: t.firstColHeader }))}>
                <i className={`fas ${t.icon}`} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
