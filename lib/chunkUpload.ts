import fs from "fs";
import os from "os";
import path from "path";

/**
 * Big uploads (Import ZIPs, backups) arrive in pieces: Cloudflare refuses a single request over 100 MB and
 * Next.js cuts request bodies at 10 MB, so the browser sends 8 MB chunks that are appended here in order.
 */
export const CHUNK_BYTES = 8 * 1024 * 1024;
const DIR = path.join(os.tmpdir(), "cms-upload-chunks");
const ID = /^[a-f0-9]{32}$/;
const MAX_AGE_MS = 24 * 3600_000;

function cleanup() {
  try {
    const now = Date.now();
    for (const f of fs.readdirSync(DIR)) {
      const p = path.join(DIR, f);
      if (now - fs.statSync(p).mtimeMs > MAX_AGE_MS) fs.rmSync(p, { force: true });
    }
  } catch {}
}

/** Appends one chunk. `offset` = bytes the browser has already sent; a retried chunk is accepted once. */
export function saveChunk(id: string, offset: number, last: boolean, data: Buffer): { ok: true; done: boolean } | { ok: false; error: string } {
  if (!ID.test(id)) return { ok: false, error: "Bad upload id." };
  fs.mkdirSync(DIR, { recursive: true });
  if (offset === 0) cleanup();
  const part = path.join(DIR, `${id}.part`);
  const size = fs.existsSync(part) ? fs.statSync(part).size : 0;
  if (offset === 0 && size > 0) fs.rmSync(part, { force: true });
  else if (size === offset + data.length) {
    // This chunk already arrived (the browser retried after a lost reply).
  } else if (size !== offset) return { ok: false, error: "Upload pieces arrived out of order — please try again." };
  if (!(size === offset + data.length && offset !== 0)) fs.appendFileSync(part, data);
  if (last) fs.renameSync(part, path.join(DIR, `${id}.zip`));
  return { ok: true, done: last };
}

/** Path of a finished upload, or null. */
export function uploadedFile(id: string): string | null {
  if (!ID.test(id)) return null;
  const p = path.join(DIR, `${id}.zip`);
  return fs.existsSync(p) ? p : null;
}

export function dropUpload(id: string) {
  const p = uploadedFile(id);
  if (p) fs.rmSync(p, { force: true });
}
