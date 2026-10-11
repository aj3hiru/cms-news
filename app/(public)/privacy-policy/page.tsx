import type { Metadata } from "next";
import { PageReader, buildPageMetadata } from "@/components/PageReader";

// Re-checked every minute; saving a page also refreshes it at once (lib/pageAdmin.ts).
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("privacy-policy");
}

export default function PrivacyPolicyPage() {
  return <PageReader slug="privacy-policy" />;
}
