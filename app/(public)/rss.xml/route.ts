import { permanentRedirect } from "next/navigation";

/** Older feed address → /feed (301), as WordPress sends /rss to its feed. */
export function GET() {
  permanentRedirect("/feed");
}
