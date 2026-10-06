import { NextResponse } from "next/server";
import { getTheme } from "@/lib/theme/settings";
import { getCardPostsRange } from "@/lib/theme/cards";
import { HOME_BATCH } from "@/lib/theme/homeFeed";

/** Next batch of homepage cards (featured layout loads the page in steps as the reader scrolls). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const int = (k: string, d: number) => {
    const n = parseInt(q.get(k) ?? "", 10);
    return Number.isFinite(n) ? n : d;
  };
  const theme = await getTheme();
  const perPage = Math.max(4, Math.min(60, theme.archive.home_count));
  const page = Math.max(1, Math.min(10_000, int("page", 1)));
  const offset = Math.max(0, Math.min(perPage, int("offset", 0)));
  const take = Math.max(0, Math.min(HOME_BATCH * 2, int("limit", HOME_BATCH), perPage - offset));
  if (!take) return NextResponse.json({ posts: [] });
  const { posts } = await getCardPostsRange({ kind: "all" }, (page - 1) * perPage + offset, take);
  return NextResponse.json({ posts: posts.map((p) => ({ ...p, date: p.date ? p.date.toISOString() : null })) });
}
