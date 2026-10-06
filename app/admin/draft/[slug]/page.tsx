import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PostReader } from "@/components/post/PostReader";
import { PageReader } from "@/components/PageReader";
import { ThemeHead } from "@/components/theme/ThemeHead";
import { SiteHeader } from "@/components/theme/SiteHeader";
import { SiteFooter } from "@/components/theme/SiteFooter";

/** Staff preview of a draft post or page, with the site header and footer. */
export default async function DraftPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) notFound();

  // Ports draft.php's lookup order: try posts first, then pages, 404 if
  // neither matches — auth for this whole /admin/* segment is already
  // enforced by app/admin/layout.tsx (equivalent to require_login.php).
  const post = await prisma.post.findFirst({ where: { slug }, select: { id: true } });
  if (post) {
    return (
      <>
        <ThemeHead />
        <SiteHeader />
        <PostReader slug={slug} preview />
        <SiteFooter />
      </>
    );
  }

  const page = await prisma.page.findFirst({ where: { slug }, select: { id: true } });
  if (page) {
    return (
      <>
        <ThemeHead />
        <SiteHeader />
        <PageReader slug={slug} preview />
        <SiteFooter />
      </>
    );
  }

  notFound();
}
