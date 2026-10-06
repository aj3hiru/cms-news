import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCsrfToken } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rateLimit";

/** [contact_form] submissions → contact_submissions (Admin → Contact Messages). */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit("contact_form", 600, 5);
  if (!rl.allowed) return NextResponse.json({ success: false, message: "Too many messages. Please try again later." }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  }
  if (!(await verifyCsrfToken(String(form.get("cTkn") ?? "")))) {
    return NextResponse.json({ success: false, message: "Session expired — reload the page and try again." }, { status: 403 });
  }
  // Honeypot: pretend success so bots move on.
  if (String(form.get("website") ?? "").trim()) return NextResponse.json({ success: true });

  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  const email = String(form.get("email") ?? "").trim().slice(0, 150);
  const message = String(form.get("message") ?? "").trim().slice(0, 5000);
  const page = String(form.get("page") ?? "").trim().slice(0, 200);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, message: "Please fill in your name, a valid email and a message." }, { status: 400 });
  }
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "").trim().slice(0, 45);
  await prisma.contactSubmission.create({ data: { name, email, message, subject: page ? `From ${page}` : null, ip: ip || null } });
  return NextResponse.json({ success: true });
}
