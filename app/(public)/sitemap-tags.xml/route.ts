import { permanentRedirect } from "next/navigation";

/** Older address — moved to the Rank Math name. */
export function GET() {
  permanentRedirect("/post_tag-sitemap.xml");
}
