import { open } from "fs/promises";
import { resolveLocalPath } from "../localStorage";

export interface ImageInfo {
  width: number;
  height: number;
  type: string;
}

const memo = new Map<string, ImageInfo | null>();

/** Width / height / MIME type of an uploaded image, read from the first bytes of the file (no image library). */
export async function getImageInfo(storedPath: string | null | undefined): Promise<ImageInfo | null> {
  if (!storedPath || /^https?:\/\//i.test(storedPath)) return null;
  if (memo.has(storedPath)) return memo.get(storedPath)!;
  const abs = resolveLocalPath(storedPath);
  let info: ImageInfo | null = null;
  if (abs) {
    const fh = await open(abs, "r").catch(() => null);
    if (fh) {
      try {
        const buf = Buffer.alloc(64 * 1024);
        const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
        info = parseHeader(buf.subarray(0, bytesRead));
      } catch {
        info = null;
      } finally {
        await fh.close();
      }
    }
  }
  if (memo.size > 2000) memo.clear();
  memo.set(storedPath, info);
  return info;
}

function parseHeader(b: Buffer): ImageInfo | null {
  if (b.length < 30) return null;
  // PNG
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), type: "image/png" };
  // GIF
  if (b.toString("ascii", 0, 3) === "GIF") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8), type: "image/gif" };
  // WebP
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3), type: "image/webp" };
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, type: "image/webp" };
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff), type: "image/webp" };
    }
    return null;
  }
  // JPEG: walk the segments to the first SOF marker.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5), type: "image/jpeg" };
      }
      i += 2 + len;
    }
  }
  return null;
}
