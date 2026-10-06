/**
 * Creates (or resets) an admin login with an author profile.
 *   ADMIN_USERNAME=… ADMIN_PASSWORD=… ADMIN_NAME="…" ADMIN_EMAIL=… node --env-file=.env node_modules/.bin/tsx scripts/create-admin.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || username || "";
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!username || !email || password.length < 8) throw new Error("ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) are required.");

  // Same full permission set the seed gives the first admin.
  const seedAdmin = await prisma.user.findFirst({ where: { role: "admin", permissions: { not: null } }, select: { permissions: true } });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { username },
    create: { username, email, passwordHash, role: "admin", status: "active", permissions: seedAdmin?.permissions ?? null },
    update: { email, passwordHash, role: "admin", status: "active", ...(seedAdmin?.permissions ? { permissions: seedAdmin.permissions } : {}) },
  });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || username.toLowerCase();
  await prisma.author.upsert({
    where: { userId: user.id },
    create: { userId: user.id, fullName: name, name, slug, email, status: "active" },
    update: { fullName: name, name, email, status: "active" },
  });
  console.log(`Admin ready: ${username} (${name})`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
