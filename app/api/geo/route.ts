import { NextResponse } from "next/server";

/** Visitor's country (from Cloudflare) for the cookie banner; pages themselves are cached and the same for everyone. */
export function GET(req: Request) {
  const c = (req.headers.get("cf-ipcountry") || "XX").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2) || "XX";
  return NextResponse.json({ c }, { headers: { "Cache-Control": "private, no-store", Vary: "CF-IPCountry" } });
}
