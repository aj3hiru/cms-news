import { prisma } from "../db";
import { resolveSiteConfig } from "../config";
import { postUrl, resolveMediaUrl } from "../urls";
import { getPushSettings } from "./settings";
import { kickPushQueue, queueCampaign } from "./queue";

/** "Send on publish": one notification per post, the first time it goes live. Never throws. */
export async function notifyPostPublished(postId: number): Promise<void> {
  try {
    const s = await getPushSettings();
    if (!s.autoSendOnPublish || !s.configured) return;
    if (await prisma.pushCampaign.count({ where: { postId, source: "auto" } })) return;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        status: true,
        title: true,
        slug: true,
        featuredImage: { select: { filePath: true } },
        postMeta: { where: { metaKey: { in: ["summary", "description"] } }, select: { metaKey: true, metaValue: true } },
      },
    });
    if (!post || post.status !== "published") return;
    const cfg = await resolveSiteConfig("");
    const m = Object.fromEntries(post.postMeta.map((x) => [x.metaKey, x.metaValue ?? ""]));
    const abs = (u: string) => (/^https?:\/\//.test(u) ? u : `${cfg.siteUrl}${u}`);
    await queueCampaign({
      title: post.title,
      body: (m.summary || m.description || "").slice(0, 180),
      url: abs(postUrl(post.slug)),
      image: post.featuredImage?.filePath ? abs(resolveMediaUrl(post.featuredImage.filePath)) : null,
      postId,
      source: "auto",
    });
    kickPushQueue();
  } catch (e) {
    console.error("[push] auto-send failed:", e instanceof Error ? e.message : e);
  }
}
