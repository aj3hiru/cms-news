import type { Metadata } from "next";
import { PageReader, buildPageMetadata } from "@/components/PageReader";

// Re-checked every minute; saving a page also refreshes it at once (lib/pageAdmin.ts).
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildPageMetadata(slug);
}

export default async function GenericPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PageReader slug={slug} />;
}
