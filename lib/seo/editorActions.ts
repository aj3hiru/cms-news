"use server";

import { prisma } from "../db";
import { requireUser } from "../auth";

/** Post editor → SEO checks: how many OTHER posts already use this focus keyword (any of their keywords). */
export async function focusKeywordUsage(keyword: string, excludePostId: number): Promise<number> {
  if (!(await requireUser())) return 0;
  const kw = keyword.trim().toLowerCase();
  if (!kw) return 0;
  const rows = await prisma.postMeta.findMany({
    where: { metaKey: "focus_keyword", metaValue: { contains: kw }, ...(excludePostId ? { postId: { not: excludePostId } } : {}) },
    select: { postId: true, metaValue: true },
    take: 500,
  });
  return new Set(rows.filter((r) => (r.metaValue ?? "").split(",").some((k) => k.trim().toLowerCase() === kw)).map((r) => r.postId)).size;
}
