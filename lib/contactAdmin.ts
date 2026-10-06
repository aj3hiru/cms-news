"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireUser } from "./auth";

async function staff() {
  const u = await requireUser();
  if (!u || (u.role !== "admin" && u.role !== "editor")) throw new Error("Not allowed.");
}

export async function setContactStatus(id: number, status: "new" | "read" | "replied") {
  await staff();
  await prisma.contactSubmission.update({ where: { id }, data: { status } });
  revalidatePath("/admin/contact-messages");
}

export async function deleteContactMessage(id: number) {
  await staff();
  await prisma.contactSubmission.delete({ where: { id } });
  revalidatePath("/admin/contact-messages");
}
