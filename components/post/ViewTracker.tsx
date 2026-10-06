"use client";

import { useEffect } from "react";

const COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Counts one view per post per visitor every 6 hours. */
export function ViewTracker({ postId, slug }: { postId: number; slug: string }) {
  useEffect(() => {
    const key = `view_cooldown_${postId}`;
    const now = Date.now();
    try {
      if (now - Number(localStorage.getItem(key) ?? 0) < COOLDOWN_MS) return;
    } catch {
      // storage blocked — still count
    }
    const ref = document.referrer;
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then(async (d: { token?: string }) => {
        const body = new URLSearchParams({ slug, cTkn: d.token ?? "", ref });
        const res = await fetch("/api/track-view", { method: "POST", body, keepalive: true });
        if (res.ok) {
          try {
            localStorage.setItem(key, String(now));
          } catch {}
        }
      })
      .catch(() => {});
  }, [postId, slug]);
  return null;
}
