import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { categoryUrl } from "@/lib/urls";
import { getSiteContext } from "@/lib/theme/site";
import { getSeoSettings, formatTitle } from "@/lib/seo/settings";
import { robotsMeta, alternatesWithFeed } from "@/lib/seo/meta";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const [ctx, seo] = await Promise.all([getSiteContext(), getSeoSettings()]);
  return {
    title: { absolute: formatTitle(seo.archive_title_format, { term: ctx.t.allCategories, sitename: ctx.siteName, sep: seo.separator }) },
    description: `Browse every topic on ${ctx.siteName}.`,
    alternates: alternatesWithFeed("/categories", ctx.siteName),
    robots: robotsMeta(seo),
  };
}

export default async function CategoriesPage() {
  const { t } = await getSiteContext();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { posts: { where: { status: "published" } } } } },
  });
  return (
    <main className="nb-archive">
      <header className="nb-archive-head">
        <span className="nb-archive-kicker">
          {categories.length} · {t.categories}
        </span>
        <h1>{t.allCategories}</h1>
      </header>
      <div className="nb-cat-pills">
        {categories.map((c) => (
          <a key={c.id} href={categoryUrl(c.slug)}>
            {c.name}
            <span>({c._count.posts})</span>
          </a>
        ))}
      </div>
    </main>
  );
}
