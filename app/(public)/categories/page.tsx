import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { categoryUrl } from "@/lib/urls";
import { getSiteContext } from "@/lib/theme/site";
import { getSeoSettings, formatTitle } from "@/lib/seo/settings";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const [ctx, seo] = await Promise.all([getSiteContext(), getSeoSettings()]);
  return {
    title: { absolute: formatTitle(seo.archive_title_format, { term: "All Categories", sitename: ctx.siteName, sep: seo.separator }) },
    description: `Browse every topic on ${ctx.siteName}.`,
    alternates: { canonical: "/categories" },
  };
}

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { posts: { where: { status: "published" } } } } },
  });
  return (
    <main className="nb-archive">
      <header className="nb-archive-head">
        <span className="nb-archive-kicker">{categories.length} {categories.length === 1 ? "category" : "categories"}</span>
        <h1>All Categories</h1>
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
