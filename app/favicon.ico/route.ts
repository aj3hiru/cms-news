import { getAppConfig, resolveSiteConfig } from "@/lib/config";
import { resolveMediaUrl } from "@/lib/urls";

/** /favicon.ico — the Site Icon (Customizer → Site Identity), or a simple letter icon. */
export async function GET() {
  const [app, cfg] = await Promise.all([getAppConfig(), resolveSiteConfig("")]);
  const icon = app.site_favicon?.trim();
  if (icon) return new Response(null, { status: 302, headers: { Location: resolveMediaUrl(icon), "Cache-Control": "public, max-age=3600" } });
  const letter = (cfg.siteName.trim()[0] ?? "N").toUpperCase().replace(/[<&>"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0c6878"/><text x="32" y="44" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
