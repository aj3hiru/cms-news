import { getCommentTree } from "@/lib/comments";
import { CommentsClient } from "./CommentsClient";
import type { Dict } from "@/lib/i18n/public";

const COMMENTS_PAGE_SIZE = 5;

export async function CommentsSection({ postId, t }: { postId: number; t?: Dict }) {
  const { tree, total } = await getCommentTree(postId, 0, COMMENTS_PAGE_SIZE);

  return (
    <CommentsClient
      postId={postId}
      initialComments={tree}
      initialTotal={total}
      labels={
        t
          ? { leave: t.leaveComment, comments: t.comments, thoughts: t.shareThoughts, name: t.name, email: t.email, remember: t.rememberMe, post: t.postComment, posting: t.posting, replyingTo: t.replyingTo, reply: t.reply, cancel: t.cancel, more: t.showMore }
          : undefined
      }
    />
  );
}
