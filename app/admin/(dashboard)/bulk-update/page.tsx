import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBulkSources } from "@/lib/bulkUpdate";
import { BulkUpdateClient } from "@/components/admin/BulkUpdateClient";

export const dynamic = "force-dynamic";

export default async function BulkUpdatePage() {
  const user = await requireUser();
  if (!user || (user.role !== "admin" && user.role !== "editor")) redirect("/admin/dashboard");
  return <BulkUpdateClient initial={await getBulkSources()} />;
}
