"use client";

import { SOCIAL_NETWORKS, type SocialNetwork, type ThemeSettings } from "@/lib/theme/types";
import { SOCIAL_LABELS, SocialIcon } from "@/components/theme/icons";
import { useCz } from "../Customizer";
import { CircleBtn, Hint, MediaField, Section, Text, Toggle } from "../fields";
import { MenuEditor } from "./MenusPanel";

type F = ThemeSettings["footer"];

export function FooterPanel() {
  const { theme, update } = useCz();
  const f = theme.footer;
  const set = <K extends keyof F>(k: K, v: F[K]) => update((t) => void (t.footer[k] = v));
  return (
    <>
      <Section title="About" defaultOpen>
        <MediaField label="Footer logo" value={f.logo} onChange={(v) => set("logo", v)} hint="Empty = the site logo." />
        <Text label="Description" multiline value={f.description} onChange={(v) => set("description", v)} hint="HTML and shortcodes allowed." />
      </Section>
      <Section title="Link columns" badge={String(f.columns.length)}>
        {f.columns.map((col, i) => (
          <div className="cz-colbox" key={i}>
            <div className="cz-item-row">
              <input className="cz-inline-input" value={col.title} placeholder="Column heading" onChange={(e) => update((t) => void (t.footer.columns[i].title = e.target.value))} />
              <CircleBtn icon="fa-trash-can" title="Remove column" danger onClick={() => update((t) => void t.footer.columns.splice(i, 1))} />
            </div>
            <Toggle label="List all categories automatically" checked={col.auto === "categories"} onChange={(v) => update((t) => void (t.footer.columns[i].auto = v ? "categories" : ""))} />
            {col.auto !== "categories" && <MenuEditor items={col.links} onChange={(v) => update((t) => void (t.footer.columns[i].links = v))} nested={false} />}
          </div>
        ))}
        {f.columns.length < 4 && (
          <button type="button" className="cz-btn-outline" onClick={() => update((t) => void t.footer.columns.push({ title: "Links", links: [] }))}>
            <i className="fas fa-plus" /> Add column
          </button>
        )}
      </Section>
      <Section title="Follow Us box" defaultOpen>
        <Text label="Heading" value={f.follow_title} onChange={(v) => set("follow_title", v)} />
        <Toggle label="Show the box" checked={f.cta} onChange={(v) => set("cta", v)} />
        <Text label="Box title" value={f.cta_title} onChange={(v) => set("cta_title", v)} />
        <Text label="Box subtitle" value={f.cta_subtitle} onChange={(v) => set("cta_subtitle", v)} />
        <Text label="Button text (optional)" value={f.cta_button_label} onChange={(v) => set("cta_button_label", v)} />
        <Text label="Button link" value={f.cta_button_url} onChange={(v) => set("cta_button_url", v)} />
      </Section>
      <Section title="Social networks" defaultOpen badge={String(f.socials.filter((s) => s.url).length)}>
        <Hint>White icons without background. Also used in the header and the mobile menu. Empty links are hidden.</Hint>
        {f.socials.map((s, i) => (
          <div className="cz-social" key={i}>
            <span className="cz-social-ico">
              <SocialIcon network={s.network} className="cz-si" />
            </span>
            <select value={s.network} onChange={(e) => update((t) => void (t.footer.socials[i].network = e.target.value as SocialNetwork))}>
              {SOCIAL_NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {SOCIAL_LABELS[n]}
                </option>
              ))}
            </select>
            <input value={s.url} placeholder="https://…" onChange={(e) => update((t) => void (t.footer.socials[i].url = e.target.value))} />
            <CircleBtn icon="fa-trash-can" title="Remove" danger onClick={() => update((t) => void t.footer.socials.splice(i, 1))} />
          </div>
        ))}
        <button type="button" className="cz-btn-outline" onClick={() => update((t) => void t.footer.socials.push({ network: "facebook", url: "" }))}>
          <i className="fas fa-plus" /> Add social network
        </button>
      </Section>
      <Section title="Copyright" defaultOpen>
        <Text label="Copyright text" multiline value={f.copyright} onChange={(v) => set("copyright", v)} hint="Shortcodes: [year] [site_title] [site_link]" />
      </Section>
    </>
  );
}
