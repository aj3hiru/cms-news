"use client";

import { useCz } from "../Customizer";
import { MediaField, Range, Section, Text, Toggle } from "../fields";

export function IdentityPanel() {
  const { theme, update, identity, setIdentity } = useCz();
  return (
    <>
      <Section title="Site Title & Tagline" defaultOpen>
        <Text label="Site Title" value={identity.siteTitle} onChange={(v) => setIdentity({ siteTitle: v })} />
        <Toggle label="Hide site title" checked={theme.identity.hide_title} onChange={(v) => update((t) => void (t.identity.hide_title = v))} hint="Hidden only when a logo is set." />
        <Text label="Tagline" value={identity.tagline} onChange={(v) => setIdentity({ tagline: v })} hint="In a few words, explain what this site is about." />
        <Toggle label="Hide site tagline" checked={theme.identity.hide_tagline} onChange={(v) => update((t) => void (t.identity.hide_tagline = v))} />
      </Section>
      <Section title="Logo" defaultOpen>
        <MediaField label="Logo" value={identity.logo} onChange={(v) => setIdentity({ logo: v })} />
        <MediaField label="Retina Logo" value={theme.identity.retina_logo} onChange={(v) => update((t) => void (t.identity.retina_logo = v))} hint="Twice the size of the logo, for sharp display on high-resolution screens." />
        <Range label="Logo width" unit="px" min={40} max={400} value={theme.identity.logo_width} onChange={(v) => update((t) => void (t.identity.logo_width = v))} />
        <Range label="Logo height (header)" unit="px" min={24} max={120} value={theme.header.logo_height} onChange={(v) => update((t) => void (t.header.logo_height = v))} />
      </Section>
      <Section title="Site Icon" defaultOpen>
        <MediaField label="Site Icon" value={identity.favicon} onChange={(v) => setIdentity({ favicon: v })} hint="The Site Icon is what you see in browser tabs, bookmark bars, and within mobile apps. It should be square and at least 512 × 512 pixels." />
      </Section>
    </>
  );
}
