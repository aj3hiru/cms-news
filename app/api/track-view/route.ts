import { NextResponse, type NextRequest } from "next/server";
import { verifyCsrfToken } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rateLimit";
import { classifyTrafficSource, getVisitorCountry, getStableVisitorId } from "@/lib/analyticsTracking";
import { istCalendarDate, istHourStart } from "@/lib/istDate";
import { postForSlug, recordView } from "@/lib/viewBuffer";

const VISITOR_COOKIE = "cms_visitor_id";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Counts one post view (whole post = chapter 1 in the stats tables). */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit("track_view_hits", 60, 30);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, message: "Rate limited" }, { status: 429 });
  }

  let slug = "";
  let submittedToken: string | null = null;
  let submittedReferrer: string | null = null;
  try {
    const body = await request.formData();
    slug = String(body.get("slug") ?? "");
    submittedToken = (body.get("cTkn") as string | null) ?? null;
    submittedReferrer = (body.get("ref") as string | null) ?? null;
  } catch {
    // empty or malformed body
  }

  if (!(await verifyCsrfToken(submittedToken))) {
    return NextResponse.json({ success: false, message: "Forbidden: Invalid CSRF token" }, { status: 403 });
  }
  if (!slug) return NextResponse.json({ success: false, message: "Missing post" }, { status: 400 });

  const post = await postForSlug(slug);
  if (!post) {
    return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
  }

  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const response = NextResponse.json({ success: true, message: "View tracked" });
  if (!visitorId) {
    // Real bug fixed here: this used to generate a brand-new random ID
    // (randomBytes(16)) every single time the cookie was missing —
    // private/incognito browsing, cookies blocked, or just this
    // visitor's very first request before the Set-Cookie below reaches
    // their browser — meaningfully inflating "Unique Visitors" for any
    // visitor who doesn't retain cookies. getStableVisitorId() derives
    // a stable, cookie-less ID from Cloudflare's real-IP header (every
    // domain here runs behind Cloudflare with the proxy on) + User-
    // Agent + the current date instead, so the SAME cookie-less visitor
    // revisiting the same day is correctly counted once. The cookie
    // remains the primary, preferred identity — this is purely the
    // fallback for when it's unavailable.
    visitorId = getStableVisitorId(request);
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: ONE_YEAR_SECONDS,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  }

  // Counted in memory and written in batches (lib/viewBuffer) — a traffic spike can't exhaust the database.
  const referrer = submittedReferrer || request.headers.get("referer") || "";
  const now = new Date();
  recordView({
    post,
    visitorId,
    visitDate: istCalendarDate(now),
    statHour: istHourStart(now),
    source: classifyTrafficSource(referrer, request.headers.get("host") ?? ""),
    country: getVisitorCountry(request),
  });

  return response;
}
