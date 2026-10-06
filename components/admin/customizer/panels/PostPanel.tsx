"use client";

import { useEffect } from "react";
import type { PostTemplate } from "@/lib/theme/types";
import { useCz } from "../Customizer";
import { Hint, Range, Section, Segmented, Text, Toggle } from "../fields";

export function PostPanel() {
  const { theme, update, previewPath } = useCz();
  const pt = theme.post;
  const set = <K extends keyof PostTemplate>(k: K, v: PostTemplate[K]) => update((t) => void (t.post[k] = v));
  // Show an article while editing the article template.
  useEffect(() => previewPath("/admin/customize/latest-post"), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Section title="Design" defaultOpen>
        <div className="cz-templates">
          <button type="button" className={`cz-tpl${pt.design === "classic" ? " active" : ""}`} onClick={() => set("design", "classic")}>
            <span className="cz-tpl-art cz-tpl-post-classic" aria-hidden="true">
              <i className="bc" />
              <i className="badge" />
              <i className="t1" />
              <i className="t2" />
              <i className="meta" />
            </span>
            <strong>Classic</strong>
            <small>Breadcrumb, category badge, title, author row with Join / Follow / Google buttons</small>
          </button>
          <button type="button" className={`cz-tpl${pt.design === "card" ? " active" : ""}`} onClick={() => set("design", "card")}>
            <span className="cz-tpl-art cz-tpl-post-card" aria-hidden="true">
              <i className="cat" />
              <i className="t1" />
              <i className="t2" />
              <i className="meta" />
            </span>
            <strong>Card header</strong>
            <small>Title in a bordered card with category, author ✓, date and the Google buttons</small>
          </button>
        </div>
      </Section>

      {pt.design === "classic" ? (
        <Section title="Classic header options" defaultOpen>
          <Toggle label="Breadcrumb" checked={pt.breadcrumb} onChange={(v) => set("breadcrumb", v)} />
          <Toggle label="Category badge" checked={pt.category_badge} onChange={(v) => set("category_badge", v)} />
          <Toggle label="Author & date row" checked={pt.meta_row} onChange={(v) => set("meta_row", v)} />
          {pt.meta_row && (
            <>
              <div className="cz-subbox">
                <Toggle label="“Join Us” button" checked={pt.pill_join} onChange={(v) => set("pill_join", v)} />
                {pt.pill_join && (
                  <>
                    <Text label="Text" value={pt.pill_join_label} onChange={(v) => set("pill_join_label", v)} />
                    <Text label="Link (e.g. WhatsApp channel)" value={pt.pill_join_url} placeholder="https://whatsapp.com/channel/…" onChange={(v) => set("pill_join_url", v)} />
                  </>
                )}
              </div>
              <div className="cz-subbox">
                <Toggle label="“Follow Us” button" checked={pt.pill_follow} onChange={(v) => set("pill_follow", v)} />
                {pt.pill_follow && (
                  <>
                    <Text label="Text" value={pt.pill_follow_label} onChange={(v) => set("pill_follow_label", v)} />
                    <Text label="Link (e.g. Google News)" value={pt.pill_follow_url} onChange={(v) => set("pill_follow_url", v)} />
                  </>
                )}
              </div>
              <Toggle label="“Add as a preferred source on Google”" checked={pt.pill_preferred_source} onChange={(v) => set("pill_preferred_source", v)} />
            </>
          )}
        </Section>
      ) : (
        <Section title="Card header options" defaultOpen>
          <Toggle label="Category label (⚡ CATEGORY)" checked={pt.category_badge} onChange={(v) => set("category_badge", v)} />
          <Toggle label="Author & date" checked={pt.meta_row} onChange={(v) => set("meta_row", v)} />
          <Toggle label="“Add as a preferred source on Google”" checked={pt.pill_preferred_source} onChange={(v) => set("pill_preferred_source", v)} />
          <Toggle label="Google News icon (own box)" checked={pt.card_gn_box} onChange={(v) => set("card_gn_box", v)} />
          {pt.card_gn_box && <Text label="Google News link" value={pt.pill_follow_url} placeholder="https://news.google.com/…" onChange={(v) => set("pill_follow_url", v)} />}
          <Toggle label="Breadcrumb above the card" checked={pt.breadcrumb} onChange={(v) => set("breadcrumb", v)} />
        </Section>
      )}

      <Section title="Date">
        <Segmented
          label="Date shown"
          value={pt.show_updated_date ? "updated" : "published"}
          onChange={(v) => set("show_updated_date", v === "updated")}
          options={[
            ["updated", "Last updated"],
            ["published", "First published"],
          ]}
        />
      </Section>

      <Section title="Featured image">
        <Toggle label="Featured image" checked={pt.featured_image} onChange={(v) => set("featured_image", v)} />
        <Toggle label="Caption under the image (alt text)" checked={pt.featured_caption} onChange={(v) => set("featured_caption", v)} />
      </Section>

      <Section title="Summary & Key Points">
        <Toggle label="Summary box" checked={pt.summary} onChange={(v) => set("summary", v)} />
        {pt.summary && <Text label="Summary heading" value={pt.summary_title} onChange={(v) => set("summary_title", v)} />}
        <Toggle label="Key Points box" checked={pt.key_points} onChange={(v) => set("key_points", v)} />
        {pt.key_points && (
          <>
            <Text label="Key Points heading" value={pt.key_points_title} onChange={(v) => set("key_points_title", v)} />
            <Range label="Show after paragraph (0 = above the article)" min={0} max={10} value={pt.key_points_after} onChange={(v) => set("key_points_after", v)} />
            <Segmented
              label="Bullet style"
              value={pt.key_points_style}
              onChange={(v) => set("key_points_style", v)}
              options={[
                ["check", "✓ Checks"],
                ["number", "1 2 3"],
                ["dot", "• Dots"],
              ]}
            />
          </>
        )}
      </Section>

      <Section title="Table of Contents">
        <Toggle label="Table of contents" checked={pt.toc} onChange={(v) => set("toc", v)} hint="Built from the H2 and H3 headings." />
        {pt.toc && (
          <>
            <Text label="Heading" value={pt.toc_title} onChange={(v) => set("toc_title", v)} />
            <Toggle label="Start collapsed" checked={pt.toc_collapsed} onChange={(v) => set("toc_collapsed", v)} />
          </>
        )}
      </Section>

      <Section title="After the article">
        <Toggle label="FAQs" checked={pt.faq} onChange={(v) => set("faq", v)} />
        <Toggle label="Tags" checked={pt.tags} onChange={(v) => set("tags", v)} />
        <Toggle label="Share buttons" checked={pt.share_buttons} onChange={(v) => set("share_buttons", v)} />
        <Toggle label="Author box" checked={pt.author_box} onChange={(v) => set("author_box", v)} />
        <Toggle label="Join WhatsApp / Telegram boxes" checked={pt.join_boxes} onChange={(v) => set("join_boxes", v)} />
        {pt.join_boxes && (
          <>
            <Text label="WhatsApp link" value={pt.join_whatsapp_url} onChange={(v) => set("join_whatsapp_url", v)} />
            <Text label="Telegram link" value={pt.join_telegram_url} onChange={(v) => set("join_telegram_url", v)} />
          </>
        )}
        <Toggle label="Related posts grid" checked={pt.related} onChange={(v) => set("related", v)} />
        {pt.related && (
          <>
            <Text label="Related heading" value={pt.related_title} onChange={(v) => set("related_title", v)} />
            <Range label="Related posts" min={1} max={12} value={pt.related_count} onChange={(v) => set("related_count", v)} />
          </>
        )}
        <Toggle label="Comments" checked={pt.comments} onChange={(v) => set("comments", v)} />
      </Section>

      <Section title="Text size">
        <Range label="Title" unit="px" min={18} max={60} value={pt.font_title} onChange={(v) => set("font_title", v)} />
        <Range label="Paragraphs" unit="px" min={12} max={26} value={pt.font_p} onChange={(v) => set("font_p", v)} />
        <Hint>For full control (font, weight, line height per device) use Typography.</Hint>
      </Section>
    </>
  );
}
