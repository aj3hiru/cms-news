"use client";

import { useEffect, useState } from "react";
import { SHORTCODE_HELP } from "@/lib/shortcodes";
import { useCz } from "../Customizer";
import { Hint, Range, Section, Segmented, Text, Toggle } from "../fields";

export function ProgressPanel() {
  const { theme, update, previewPath } = useCz();
  const pt = theme.post;
  useEffect(() => previewPath("/admin/customize/latest-post"), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Toggle
        label="Reading progress button"
        checked={pt.reading_progress}
        onChange={(v) => update((t) => void (t.post.reading_progress = v))}
        hint="A floating pill that fills as the reader scrolls, shows the section and minutes left, and lists the H2 headings to jump to."
      />
      <Text label="Title of the sections list" value={pt.reading_progress_label} onChange={(v) => update((t) => void (t.post.reading_progress_label = v))} />
      <Toggle label="Also show on desktop" checked={pt.reading_progress_desktop} onChange={(v) => update((t) => void (t.post.reading_progress_desktop = v))} />
      <Hint>Switch the preview to Mobile (bottom of this panel) to see it. It only appears on articles that have H2 headings.</Hint>
    </>
  );
}

export function ArchivePanel() {
  const { theme, update } = useCz();
  const a = theme.archive;
  return (
    <>
      <Section title="Post grid" defaultOpen>
        <Segmented
          label="Columns"
          value={String(a.columns) as "1" | "2" | "3"}
          onChange={(v) => update((t) => void (t.archive.columns = Number(v) as 1 | 2 | 3))}
          options={[
            ["1", "1"],
            ["2", "2"],
            ["3", "3"],
          ]}
        />
        <Range label="Posts per page" min={2} max={50} value={a.per_page} onChange={(v) => update((t) => void (t.archive.per_page = v))} />
        <Toggle label="Author" checked={a.show_author} onChange={(v) => update((t) => void (t.archive.show_author = v))} />
        <Toggle label="Date" checked={a.show_date} onChange={(v) => update((t) => void (t.archive.show_date = v))} />
        <Toggle label="Excerpt / summary" checked={a.show_excerpt} onChange={(v) => update((t) => void (t.archive.show_excerpt = v))} />
      </Section>
      <Section title="Homepage" defaultOpen>
        <Segmented
          label="Layout"
          value={a.home_layout}
          onChange={(v) => update((t) => void (t.archive.home_layout = v))}
          options={[
            ["featured", "Lead card + 3 per row"],
            ["grid", "Same as Post grid"],
          ]}
        />
        {a.home_layout === "featured" && (
          <>
            <Hint>The newest post shows as a large card (image left, text right), the rest three per row with category, excerpt and a button. On phones every card is full width.</Hint>
            <Text label="Button text" value={a.home_read_more} onChange={(v) => update((t) => void (t.archive.home_read_more = v))} hint="Empty = no button." />
          </>
        )}
        <Text label="Heading above the posts (optional)" value={a.home_heading} onChange={(v) => update((t) => void (t.archive.home_heading = v))} hint="Shortcodes allowed. Empty = no heading." />
      </Section>
      <Hint>Where the sidebar shows is set in Sidebar.</Hint>
    </>
  );
}

export function ShortcodesPanel() {
  const [copied, setCopied] = useState("");
  return (
    <div className="cz-codes">
      <Hint>Use these anywhere: posts, pages, the footer, the top bar, SEO titles and descriptions. Click to copy.</Hint>
      {SHORTCODE_HELP.map((s) => (
        <button
          type="button"
          className="cz-code"
          key={s.code}
          onClick={() => {
            navigator.clipboard?.writeText(s.code);
            setCopied(s.code);
            setTimeout(() => setCopied(""), 1200);
          }}
        >
          <code>{s.code}</code>
          <span>{copied === s.code ? "Copied!" : s.description}</span>
        </button>
      ))}
    </div>
  );
}
