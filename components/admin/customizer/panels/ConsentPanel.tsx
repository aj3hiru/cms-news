"use client";

import type { ConsentSettings } from "@/lib/theme/types";
import { useCz } from "../Customizer";
import { Hint, Range, Section, Segmented, Select, Text, Toggle } from "../fields";

export function ConsentPanel() {
  const { theme, update } = useCz();
  const c = theme.consent;
  const set = <K extends keyof ConsentSettings>(k: K, v: ConsentSettings[K]) => update((t) => void (t.consent[k] = v));

  return (
    <>
      <Toggle
        label="Show the cookie consent popup"
        checked={c.enabled}
        onChange={(v) => set("enabled", v)}
        hint="Asks visitors before ad and analytics cookies, and passes their answer to Google (Consent Mode v2) and AdSense."
      />
      {c.enabled && (
        <>
          <Section title="Who sees it" defaultOpen>
            <Select
              label="Show to"
              value={c.show_to}
              onChange={(v) => set("show_to", v)}
              options={[
                ["all", "Every visitor"],
                ["outside_eea", "Everyone except EEA, UK & Switzerland"],
                ["eea_only", "Only EEA, UK & Switzerland"],
              ]}
            />
            <Hint>
              Europe (EEA, UK, Switzerland): for AdSense, Google requires its own certified consent message there. Turn it on in AdSense → Privacy &amp; messaging → European
              regulations, then choose “Everyone except EEA, UK &amp; Switzerland” here so visitors don’t see two popups.
            </Hint>
            <Toggle
              label="Ask before ads & analytics everywhere"
              checked={c.opt_in_everywhere}
              onChange={(v) => set("opt_in_everywhere", v)}
              hint="Off: only EEA/UK/CH visitors wait for a choice (ads paused until they answer); others get ads right away and can still reject. On: everyone waits."
            />
          </Section>

          <Section title="Look" defaultOpen>
            <Segmented
              label="Position"
              value={c.position}
              onChange={(v) => set("position", v)}
              options={[
                ["bottom", "Bottom"],
                ["bottom-left", "Bottom left"],
                ["center", "Center"],
                ["bar", "Full bar"],
              ]}
            />
            <Hint>Colours follow your button colour (Colors → Buttons).</Hint>
          </Section>

          <Section title="Text" defaultOpen>
            <Text label="Title" value={c.title} onChange={(v) => set("title", v)} />
            <Text label="Message" value={c.message} multiline onChange={(v) => set("message", v)} />
            <Text label="Privacy link text" value={c.privacy_label} onChange={(v) => set("privacy_label", v)} />
            <Text label="Privacy policy URL" value={c.privacy_url} placeholder="/privacy-policy" onChange={(v) => set("privacy_url", v)} hint="Empty = no link. Google requires a privacy policy that mentions cookies and ads." />
            <Text label="“Accept” button" value={c.accept_label} onChange={(v) => set("accept_label", v)} />
            <Text label="“Reject” button" value={c.reject_label} onChange={(v) => set("reject_label", v)} />
            <Text label="“Customize” button" value={c.customize_label} onChange={(v) => set("customize_label", v)} />
            <Text label="“Save” button (in Customize)" value={c.save_label} onChange={(v) => set("save_label", v)} />
            <Hint>Untouched texts follow the site language automatically.</Hint>
          </Section>

          <Section title="Cookie types (Customize screen)">
            <Text label="Necessary — title" value={c.necessary_title} onChange={(v) => set("necessary_title", v)} />
            <Text label="Necessary — description" value={c.necessary_desc} onChange={(v) => set("necessary_desc", v)} />
            <Text label="Analytics — title" value={c.analytics_title} onChange={(v) => set("analytics_title", v)} />
            <Text label="Analytics — description" value={c.analytics_desc} onChange={(v) => set("analytics_desc", v)} />
            <Text label="Advertising — title" value={c.ads_title} onChange={(v) => set("ads_title", v)} />
            <Text label="Advertising — description" value={c.ads_desc} onChange={(v) => set("ads_desc", v)} />
            <Text label="Personalized ads — title" value={c.personal_title} onChange={(v) => set("personal_title", v)} />
            <Text label="Personalized ads — description" value={c.personal_desc} onChange={(v) => set("personal_desc", v)} />
          </Section>

          <Section title="Changing the choice later">
            <Toggle label="“Cookie settings” link in the footer" checked={c.footer_link} onChange={(v) => set("footer_link", v)} />
            {c.footer_link && <Text label="Link text" value={c.footer_link_label} onChange={(v) => set("footer_link_label", v)} />}
            <Hint>Any menu link to #cookie-settings also opens the settings.</Hint>
            <Range label="Remember the choice for" unit=" days" min={30} max={395} value={c.days} onChange={(v) => set("days", v)} />
          </Section>

          <Section title="Visitors who didn’t accept" defaultOpen>
            <Toggle
              label="Sticky cookie button"
              checked={c.sticky}
              onChange={(v) => set("sticky", v)}
              hint="A small round cookie button stays on screen for visitors who rejected or only partly accepted. Tapping it opens the choices. It disappears for good once they click Accept All."
            />
            {c.sticky && (
              <Segmented
                label="Button side"
                value={c.sticky_side}
                onChange={(v) => set("sticky_side", v)}
                options={[
                  ["left", "Bottom left"],
                  ["right", "Bottom right"],
                ]}
              />
            )}
            <Select
              label="Show the popup again"
              value={c.reask}
              onChange={(v) => set("reask", v)}
              options={[
                ["never", "Never (only the sticky button)"],
                ["page", "On every page they open"],
                ["day", "Once a day"],
                ["session", "Once per visit"],
              ]}
              hint="Only for visitors who didn’t click Accept All. Never in the EEA, UK and Switzerland: asking again after a “no” counts as pressure there (and can get AdSense flagged). Visitors who accepted never see it again."
            />
          </Section>
          <Hint>The preview always shows the popup so you can style it; clicking its buttons there doesn’t save anything.</Hint>
        </>
      )}
    </>
  );
}
