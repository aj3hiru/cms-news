import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { resolveLocalPath, sniffImageType } from "@/lib/localStorage";
import { IMAGE_WIDTHS } from "@/lib/urls";

/**
 * /i/<width>/<upload path> → that upload resized to <width> as WebP.
 * Always WebP (not chosen per browser), so Cloudflare can cache one copy per URL;
 * results are also kept on disk, outside .next so deploys don't wipe them.
 */
const CACHE_DIR = path.join(process.cwd(), ".cache", "img");
const HEADERS = { "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };

export async function GET(_req: Request, { params }: { params: Promise<{ w: string; file: string[] }> }) {
  const { w, file } = await params;
  const width = Number(w);
  const rel = file.map(decodeURIComponent).join("/");
  if (!(IMAGE_WIDTHS as readonly number[]).includes(width) || rel.includes("..") || /\.(svg|gif|ico)$/i.test(rel)) {
    return new Response("Not found", { status: 404 });
  }
  const src = resolveLocalPath(`uploads/${rel}`);
  if (!src) return new Response("Not found", { status: 404 });

  const cached = path.join(CACHE_DIR, String(width), `${rel}.webp`);
  if (!cached.startsWith(CACHE_DIR)) return new Response("Not found", { status: 404 });
  const hit = await fs.readFile(cached).catch(() => null);
  if (hit) return new Response(new Uint8Array(hit), { headers: { ...HEADERS, "Content-Type": "image/webp" } });

  const input = await fs.readFile(src).catch(() => null);
  if (!input) return new Response("Not found", { status: 404 });
  try {
    const out = await sharp(input, { limitInputPixels: 50_000_000 }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
    await fs
      .mkdir(path.dirname(cached), { recursive: true })
      .then(() => fs.writeFile(cached, out))
      .catch(() => {});
    return new Response(new Uint8Array(out), { headers: { ...HEADERS, "Content-Type": "image/webp" } });
  } catch {
    // Not decodable: send the original as it is.
    const type = sniffImageType(input);
    if (!type) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(input), { headers: { "Cache-Control": "public, max-age=3600", "Content-Type": type } });
  }
}
