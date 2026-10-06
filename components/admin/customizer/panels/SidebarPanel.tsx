"use client";

import type { ThemeSettings } from "@/lib/theme/types";
import { useCz } from "../Customizer";
import { Range, Section, Segmented, Text, Toggle } from "../fields";

type S = ThemeSettings["sidebar"];

export function SidebarPanel() {
  const { theme, update } = useCz();
  const s = theme.sidebar;
  const set = <K extends keyof S>(k: K, v: S[K]) => update((t) => void (t.sidebar[k] = v));
  return (
    <>
      <Section title="Show the sidebar on" defaultOpen>
        <Toggle label="Homepage" checked={s.on_home} onChange={(v) => set("on_home", v)} />
        <Toggle label="Posts (articles)" checked={s.on_post} onChange={(v) => set("on_post", v)} />
        <Toggle label="Category pages" checked={s.on_category} onChange={(v) => set("on_category", v)} />
        <Toggle label="Tag pages" checked={s.on_tag} onChange={(v) => set("on_tag", v)} />
        <Toggle label="Author pages" checked={s.on_author} onChange={(v) => set("on_author", v)} />
        <Toggle label="Search results" checked={s.on_search} onChange={(v) => set("on_search", v)} />
        <Toggle label="Pages (About, Contact…)" checked={s.on_page} onChange={(v) => set("on_page", v)} />
      </Section>
      <Section title="Trending widget" defaultOpen>
        <Text label="Heading" value={s.title} onChange={(v) => set("title", v)} />
        <Segmented
          label="Posts"
          value={s.source}
          onChange={(v) => set("source", v)}
          options={[
            ["trending", "Most viewed", "fa-fire"],
            ["latest", "Latest", "fa-clock"],
          ]}
        />
        <Range label="Number of posts" min={1} max={20} value={s.count} onChange={(v) => set("count", v)} />
        <Toggle label="Sticky while scrolling" checked={s.sticky} onChange={(v) => set("sticky", v)} />
      </Section>
    </>
  );
}
