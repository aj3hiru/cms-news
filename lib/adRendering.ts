import type { AdBlock, AdInsertionType, AdPageType, AdAlignment } from "./adInserterTypes";
import { getAdInserterConfig } from "./adInserterSettings";

const ALIGNMENT_CLASS: Record<AdAlignment, string> = {
  default: "",
  left: "ai-block-left",
  center: "ai-block-center",
  right: "ai-block-right",
  "float-left": "ai-block-float-left",
  "float-right": "ai-block-float-right",
};

/**
 * Ported from the reference's own block-targeting model: each of the
 * 16 Ad Inserter blocks independently chooses which page type(s) it
 * can appear on AND which insertion point within that page — a block
 * only renders when BOTH match. Wraps the raw ad code in the same
 * `.ai-block`/alignment-class treatment the reference uses (see
 * post.css's `.ai-block`/`.ai-block-center`/etc. rules, already ported
 * for the WYSIWYG editor's own output — reused here since it's the
 * exact same "arbitrary embedded ad/script HTML, aligned and
 * width-capped consistently" concern).
 */
export async function getAdHtmlFor(page: AdPageType, insertion: AdInsertionType): Promise<string> {
  const config = await getAdInserterConfig();
  const matching = config.blocks.filter(
    (b: AdBlock) => b.enabled && b.insertion === insertion && b.pages.includes(page)
  );
  if (matching.length === 0) return "";
  return matching
    .map((b) => {
      const cls = ["ai-block", ALIGNMENT_CLASS[b.alignment]].filter(Boolean).join(" ");
      return `<div class="${cls}"${b.minHeight ? ` style="min-height:${b.minHeight}px"` : ""}>${b.code}</div>`;
    })
    .join("");
}

/** For `before_paragraph`/`after_paragraph` blocks specifically — these
 *  need the block's own configured paragraph NUMBER too, not just page/
 *  insertion matching, so they're kept separate from getAdHtmlFor()
 *  rather than overloading one function with a third, sometimes-unused
 *  parameter. */
export async function getParagraphAdBlocks(
  page: AdPageType,
  insertion: "before_paragraph" | "after_paragraph"
): Promise<{ paragraph: number; html: string }[]> {
  const config = await getAdInserterConfig();
  return config.blocks
    .filter((b) => b.enabled && b.insertion === insertion && b.pages.includes(page))
    .map((b) => {
      const cls = ["ai-block", ALIGNMENT_CLASS[b.alignment]].filter(Boolean).join(" ");
      return { paragraph: Math.max(1, b.paragraph), html: `<div class="${cls}"${b.minHeight ? ` style="min-height:${b.minHeight}px"` : ""}>${b.code}</div>` };
    });
}

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
/** Containers whose paragraphs are not "article paragraphs" (quotes, lists, tables… and boxes we inject). */
const NESTED_TAGS = new Set(["blockquote", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "figure", "figcaption", "aside", "details", "summary", "pre", "nav", "form"]);
const INJECTED_CLASS = /\bclass=["'][^"']*\b(?:nb-|ai-block|ad-slot|ad-)/i;

/** Start / end offsets of the article's own paragraphs — not ones inside quotes, lists, tables or injected boxes. */
function topLevelParagraphs(html: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  const stack: boolean[] = []; // per open element: does it make its contents "nested"?
  let nested = 0;
  let pStart = -1;
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>|<!--[\s\S]*?-->/g;
  for (let m; (m = re.exec(html)); ) {
    if (!m[2]) continue; // comment
    const tag = m[2].toLowerCase();
    if (VOID_TAGS.has(tag) || m[3] === "/") continue;
    if (m[1] !== "/") {
      if (tag === "p" && nested === 0 && pStart < 0) pStart = m.index;
      const isNested = NESTED_TAGS.has(tag) || ((tag === "div" || tag === "section") && INJECTED_CLASS.test(m[0]));
      stack.push(isNested);
      if (isNested) nested++;
    } else {
      if (tag === "p" && pStart >= 0 && nested === 0) {
        out.push({ start: pStart, end: m.index + m[0].length });
        pStart = -1;
      }
      // Close up to the matching open tag (tolerates unclosed children).
      if (stack.length && stack.pop()) nested = Math.max(0, nested - 1);
    }
  }
  return out;
}

/** Inserts `insertHtml` after the Nth article paragraph (or at the end when there are fewer). */
export function injectAfterParagraph(html: string, afterN: number, insertHtml: string): string {
  if (afterN < 1 || !insertHtml.trim() || !html.trim()) return html;
  const p = topLevelParagraphs(html)[afterN - 1];
  return p ? html.slice(0, p.end) + insertHtml + html.slice(p.end) : html + insertHtml;
}

/** Same as injectAfterParagraph(), but before the Nth paragraph (Ad Inserter "Before paragraph"). */
export function injectBeforeParagraph(html: string, beforeN: number, insertHtml: string): string {
  if (beforeN < 1 || !insertHtml.trim() || !html.trim()) return html;
  const p = topLevelParagraphs(html)[beforeN - 1];
  return p ? html.slice(0, p.start) + insertHtml + html.slice(p.start) : html + insertHtml;
}


/** Paragraph blocks for list pages: "paragraph N" means the Nth post card. */
export async function getListAdSlots(page: AdPageType): Promise<{ before: Record<number, string>; after: Record<number, string> }> {
  const [before, after] = await Promise.all([getParagraphAdBlocks(page, "before_paragraph"), getParagraphAdBlocks(page, "after_paragraph")]);
  const group = (list: { paragraph: number; html: string }[]) =>
    list.reduce<Record<number, string>>((acc, b) => ({ ...acc, [b.paragraph]: (acc[b.paragraph] ?? "") + b.html }), {});
  return { before: group(before), after: group(after) };
}

/** Static pages: paragraph blocks go into the page body, like on posts. */
export async function injectParagraphAds(page: AdPageType, html: string): Promise<string> {
  const [before, after] = await Promise.all([getParagraphAdBlocks(page, "before_paragraph"), getParagraphAdBlocks(page, "after_paragraph")]);
  let out = html;
  for (const b of before) out = injectBeforeParagraph(out, b.paragraph, b.html);
  for (const b of after) out = injectAfterParagraph(out, b.paragraph, b.html);
  return out;
}
