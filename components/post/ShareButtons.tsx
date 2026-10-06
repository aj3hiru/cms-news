"use client";

import { useState } from "react";
import { SocialIcon } from "@/components/theme/icons";
import type { SocialNetwork } from "@/lib/theme/types";

/** Share row after the article: round brand-coloured icon buttons (no text), plus "Copy link". */
export function ShareButtons({ url, title, labels = { share: "Share", copy: "Copy link", copied: "Copied!" } }: { url: string; title: string; labels?: { share: string; copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  const t = encodeURIComponent(title);
  const u = encodeURIComponent(url);
  const links: { net: SocialNetwork; label: string; href: string }[] = [
    { net: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { net: "x", label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { net: "whatsapp", label: "WhatsApp", href: `https://api.whatsapp.com/send?text=${t}%20${u}` },
    { net: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { net: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { net: "email", label: "Email", href: `mailto:?subject=${t}&body=${u}` },
  ];
  return (
    <section className="nb-share" aria-label={labels.share}>
      <h2 className="screen-reader-text">{labels.share}</h2>
      <div className="nb-share-grid">
        {links.map((l) => (
          <a key={l.net} className={`nb-share-btn nb-share--${l.net}`} href={l.href} target="_blank" rel="noopener nofollow" aria-label={l.label} title={l.label}>
            <SocialIcon network={l.net} className="nb-share-ico" />
          </a>
        ))}
        <button
          type="button"
          className="nb-share-btn nb-share--copy"
          aria-label={copied ? labels.copied : labels.copy}
          title={copied ? labels.copied : labels.copy}
          onClick={() => {
            navigator.clipboard?.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            });
          }}
        >
          <svg className="nb-share-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {copied ? <path d="M20 6 9 17l-5-5" /> : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>}
          </svg>
        </button>
      </div>
    </section>
  );
}
