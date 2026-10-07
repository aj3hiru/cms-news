import { NextResponse, type NextRequest } from "next/server";
import { requireUser, resolvePermissions } from "@/lib/auth";
import { CHUNK_BYTES, saveChunk } from "@/lib/chunkUpload";

export const dynamic = "force-dynamic";

/** One piece of a large upload (raw bytes). ?id=<32 hex>&offset=<bytes so far>&last=1 on the final piece. */
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user || (user.role !== "admin" && !resolvePermissions(user).tools.import_export)) {
    return NextResponse.json({ success: false, message: "Not allowed." }, { status: 403 });
  }
  const q = request.nextUrl.searchParams;
  const id = q.get("id") ?? "";
  const offset = Number(q.get("offset"));
  if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ success: false, message: "Bad offset." }, { status: 400 });
  const data = Buffer.from(await request.arrayBuffer());
  if (data.length > CHUNK_BYTES + 1024) return NextResponse.json({ success: false, message: "Piece too large." }, { status: 413 });
  const res = saveChunk(id, offset, q.get("last") === "1", data);
  if (!res.ok) return NextResponse.json({ success: false, message: res.error }, { status: 409 });
  return NextResponse.json({ success: true, done: res.done });
}
