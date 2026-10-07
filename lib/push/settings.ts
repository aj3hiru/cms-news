import { createECDH, createHash } from "crypto";
import webpush from "web-push";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "../db";

const KEY = "push_settings";

export interface PushSettings {
  publicKey: string;
  privateKey: string;
  subject: string;
  /** Ask for permission automatically (Chrome: after the delay; Firefox/Safari: on the first tap). */
  autoPrompt: boolean;
  promptDelay: number;
  /** Bell in the header while the visitor isn't subscribed. */
  showBell: boolean;
  /** Send a notification automatically when a post is published. */
  autoSendOnPublish: boolean;
  /** Small icon shown in notifications (media path); empty = site icon. */
  icon: string;
}

export const PUSH_DEFAULTS: PushSettings = {
  publicKey: "",
  privateKey: "",
  subject: "",
  autoPrompt: true,
  promptDelay: 3,
  showBell: true,
  autoSendOnPublish: false,
  icon: "",
};

export async function getPushSettings(): Promise<PushSettings & { configured: boolean }> {
  const row = await prisma.appConfig.findUnique({ where: { configKey: KEY } });
  let saved: Partial<PushSettings> = {};
  try {
    saved = row?.configValue ? JSON.parse(row.configValue) : {};
  } catch {}
  const s = { ...PUSH_DEFAULTS, ...saved };
  return { ...s, configured: Boolean(s.publicKey && s.privateKey && s.subject) };
}

export async function savePushSettings(patch: Partial<PushSettings>): Promise<void> {
  const current = await getPushSettings();
  const { configured: _c, ...rest } = current;
  const next = { ...rest, ...patch };
  await prisma.appConfig.upsert({ where: { configKey: KEY }, create: { configKey: KEY, configValue: JSON.stringify(next) }, update: { configValue: JSON.stringify(next) } });
  revalidateTag("push-settings", "max");
}

/** Whether the header should draw the bell (cached; no secrets). */
export const getPushPublic = unstable_cache(
  async () => {
    const s = await getPushSettings();
    return { bell: s.configured && s.showBell };
  },
  ["push-public"],
  { revalidate: 300, tags: ["push-settings"] }
);

/** What every visitor's browser asks for (public key + prompt options), cached — no database query per pageview. */
export const getPushClientConfig = unstable_cache(
  async () => {
    const s = await getPushSettings();
    return { publicKey: s.configured ? s.publicKey : "", autoPrompt: s.autoPrompt, promptDelay: s.promptDelay, showBell: s.showBell };
  },
  ["push-client-config"],
  { revalidate: 300, tags: ["push-settings"] }
);

/** Safe label for a key: a hash, never the key itself. */
export function keyFingerprint(key: string): string {
  if (!key) return "";
  const h = createHash("sha256").update(key).digest("hex");
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

/** Checks that a VAPID pair is well-formed and that both keys belong together. */
export function validateVapidPair(publicKey: string, privateKey: string): string | null {
  const pubS = publicKey.trim();
  const privS = privateKey.trim();
  if (!/^[A-Za-z0-9_-]+=*$/.test(pubS) || !/^[A-Za-z0-9_-]+=*$/.test(privS)) return "Keys must be base64url text (letters, numbers, - and _).";
  const pub = Buffer.from(pubS, "base64url");
  const priv = Buffer.from(privS, "base64url");
  if (pub.length !== 65 || pub[0] !== 0x04) return 'The public key doesn\'t look right — it should be about 87 characters and start with "B".';
  if (priv.length !== 32) return "The private key doesn't look right — it should be about 43 characters.";
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(priv);
    if (!ecdh.getPublicKey().equals(pub)) return "These two keys don't belong together — copy both from the same place.";
  } catch {
    return "The private key isn't a valid P-256 key.";
  }
  return null;
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
