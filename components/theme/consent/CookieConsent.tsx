import { getSiteContext } from "@/lib/theme/site";
import { tl } from "@/lib/i18n/public";
import { consentBootScript } from "./consentBoot";
import { CookieBanner, type ConsentConfig } from "./CookieBanner";

/** Cookie consent (Customizer → Cookie Consent): Consent Mode defaults first, then the banner. */
export async function CookieConsent() {
  const { theme, t } = await getSiteContext();
  const c = theme.consent;
  if (!c.enabled) return null;
  const cfg: ConsentConfig = {
    showTo: c.show_to,
    optInEverywhere: c.opt_in_everywhere,
    position: c.position,
    days: c.days,
    sticky: c.sticky,
    stickySide: c.sticky_side,
    reask: c.reask,
    privacyUrl: c.privacy_url.trim(),
    labels: {
      title: tl(c.title, "cTitle", t),
      message: tl(c.message, "cMessage", t),
      accept: tl(c.accept_label, "cAccept", t),
      reject: tl(c.reject_label, "cReject", t),
      customize: tl(c.customize_label, "cCustomize", t),
      save: tl(c.save_label, "cSave", t),
      privacy: tl(c.privacy_label, "cPrivacy", t),
      necessary: tl(c.necessary_title, "cNecessary", t),
      necessaryDesc: tl(c.necessary_desc, "cNecessaryDesc", t),
      analytics: tl(c.analytics_title, "cAnalytics", t),
      analyticsDesc: tl(c.analytics_desc, "cAnalyticsDesc", t),
      ads: tl(c.ads_title, "cAds", t),
      adsDesc: tl(c.ads_desc, "cAdsDesc", t),
      personal: tl(c.personal_title, "cPersonal", t),
      personalDesc: tl(c.personal_desc, "cPersonalDesc", t),
      alwaysOn: t.cAlwaysOn,
      close: t.cClose,
      settings: tl(c.footer_link_label, "cSettings", t),
    },
  };
  return <CookieBanner cfg={cfg} />;
}

/** Inline Consent Mode defaults — must be the first script on the page. */
export async function ConsentBoot() {
  const { theme } = await getSiteContext();
  if (!theme.consent.enabled) return null;
  return <script dangerouslySetInnerHTML={{ __html: consentBootScript(theme.consent.opt_in_everywhere) }} />;
}
