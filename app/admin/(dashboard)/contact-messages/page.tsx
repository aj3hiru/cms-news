import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContactMessagesClient } from "@/components/admin/ContactMessagesClient";

export const dynamic = "force-dynamic";

export default async function ContactMessagesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const user = await requireUser();
  if (!user || (user.role !== "admin" && user.role !== "editor")) redirect("/admin/dashboard");
  const sp = await searchParams;
  const status = sp.status === "new" || sp.status === "read" || sp.status === "replied" ? sp.status : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const per = 20;
  const [rows, total, counts] = await Promise.all([
    prisma.contactSubmission.findMany({ where: status ? { status } : {}, orderBy: { id: "desc" }, skip: (page - 1) * per, take: per }),
    prisma.contactSubmission.count({ where: status ? { status } : {} }),
    prisma.contactSubmission.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  return (
    <ContactMessagesClient
      rows={rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null }))}
      total={total}
      page={page}
      pages={Math.max(1, Math.ceil(total / per))}
      status={status ?? "all"}
      counts={{ new: byStatus.new ?? 0, read: byStatus.read ?? 0, replied: byStatus.replied ?? 0 }}
    />
  );
}
