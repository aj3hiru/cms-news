import { draftMode } from "next/headers";
import { requireUser } from "@/lib/auth";

/**
 * Turns on preview (Next.js draft mode) for the Customizer and opens `path`.
 * In preview every page is rendered fresh with the unpublished Customizer draft.
 */
export async function GET(request: Request) {
  const user = await requireUser();
  if (!user || user.role !== "admin") return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const off = url.searchParams.get("off") === "1";
  const dm = await draftMode();
  if (off) dm.disable();
  else dm.enable();
  const raw = url.searchParams.get("path") || "/";
  const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  return new Response(null, { status: 307, headers: { Location: path, "Cache-Control": "no-store" } });
}
