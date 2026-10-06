"use client";

import type { ThemeSettings } from "@/lib/theme/types";
import { useCz } from "../Customizer";
import { Hint, Range, Section, Segmented, Text, Toggle } from "../fields";

type H = ThemeSettings["header"];

export function HeaderPanel() {
  const { theme, update } = useCz();
  const h = theme.header;
  const set = <K extends keyof H>(k: K, v: H[K]) => update((t) => void (t.header[k] = v));
  return (
    <>
      <Section title="Header Template" defaultOpen>
        <div className="cz-templates">
          <button type="button" className={`cz-tpl${h.template === "classic" ? " active" : ""}`} onClick={() => set("template", "classic")}>
            <span className="cz-tpl-art cz-tpl-classic" aria-hidden="true">
              <i className="l" />
              <i className="m" />
              <i className="s" />
            </span>
            <strong>Classic</strong>
            <small>Colored bar: logo left, menu and search right, category strip below</small>
          </button>
          <button type="button" className={`cz-tpl${h.template === "racing" ? " active" : ""}`} onClick={() => set("template", "racing")}>
            <span className="cz-tpl-art cz-tpl-racing" aria-hidden="true">
              <i className="soc" />
              <i className="l" />
              <i className="btn" />
              <i className="nav" />
            </span>
            <strong>Racing Zone</strong>
            <small>White header: social icons, centered logo, Log in + Subscribe; menu strip row below</small>
          </button>
        </div>
        {h.template === "racing" && (
          <>
            <Toggle label="Social icons on the left" checked={h.header_socials} onChange={(v) => set("header_socials", v)} hint="Uses the social links from Footer → Social Networks." />
            <Hint>The row under the logo is the Menu Strip — edit it in Menus → Menu Strip. On mobile it scrolls sideways.</Hint>
          </>
        )}
      </Section>

      <Section title="Layout" defaultOpen>
        <Toggle label="Sticky header" checked={h.sticky} onChange={(v) => set("sticky", v)} hint="Stays at the top while scrolling." />
        <Range label="Content width" unit="px" min={900} max={1600} step={10} value={h.container} onChange={(v) => set("container", v)} />
        <Range label="Logo height" unit="px" min={24} max={120} value={h.logo_height} onChange={(v) => set("logo_height", v)} />
      </Section>

      {h.template === "racing" && (
      <Section title="Log in & Subscribe buttons" defaultOpen>
        <Toggle label="Show “Log in”" checked={h.show_login} onChange={(v) => set("show_login", v)} hint="Desktop only — on mobile it is inside the menu." />
        {h.show_login && (
          <>
            <Text label="Log in text" value={h.login_label} onChange={(v) => set("login_label", v)} />
            <Text label="Log in link" value={h.login_url} placeholder="https://…" onChange={(v) => set("login_url", v)} />
          </>
        )}
        <Toggle label="Show “Subscribe”" checked={h.show_subscribe} onChange={(v) => set("show_subscribe", v)} hint="Shown on desktop and mobile." />
        {h.show_subscribe && (
          <>
            <Text label="Subscribe text" value={h.subscribe_label} onChange={(v) => set("subscribe_label", v)} />
            <Text label="Subscribe link" value={h.subscribe_url} placeholder="https://…" onChange={(v) => set("subscribe_url", v)} />
          </>
        )}
      </Section>
      )}

      <Section title="Search">
        <Toggle label="Show search" checked={h.show_search} onChange={(v) => set("show_search", v)} />
        {h.show_search && (
          <>
            {h.template === "classic" && (
              <Segmented
                label="Style"
                value={h.search_style}
                onChange={(v) => set("search_style", v)}
                options={[
                  ["inline", "Search field", "fa-magnifying-glass"],
                  ["icon", "Icon + popup", "fa-up-right-from-square"],
                ]}
              />
            )}
            <Text label="Placeholder" value={h.search_placeholder} onChange={(v) => set("search_placeholder", v)} />
            <Toggle label="Voice search" checked={h.voice_search} onChange={(v) => set("voice_search", v)} hint="Microphone button in the search popup." />
          </>
        )}
      </Section>

      <Section title="Icons & extras">
        <Toggle label="Notification bell" checked={h.bell} onChange={(v) => set("bell", v)} hint="Shown until the reader subscribes to push notifications." />
        <Toggle label="Dark mode switch" checked={h.dark_mode} onChange={(v) => set("dark_mode", v)} hint="In the menu (desktop) and the mobile menu." />
      </Section>

      <Section title="Mobile menu">
        <Text label="Greeting" value={h.drawer_title} onChange={(v) => set("drawer_title", v)} />
        <Text label="Text under the greeting" value={h.drawer_text} placeholder="Empty = tagline" onChange={(v) => set("drawer_text", v)} />
        <Hint>The mobile menu shows the Primary Menu, Log in / Subscribe and your social icons.</Hint>
      </Section>

      <Section title="Top Bar">
        <Toggle label="Show top bar (above the header)" checked={h.top_bar} onChange={(v) => set("top_bar", v)} />
        {h.top_bar && <Text label="Top bar text / HTML" multiline value={h.top_bar_html} onChange={(v) => set("top_bar_html", v)} hint="Shortcodes work here, e.g. [site_title] · [date]" />}
      </Section>
    </>
  );
}
