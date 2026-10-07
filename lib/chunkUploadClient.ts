/** Sends a file in 8 MB pieces to /api/admin/upload-chunk; returns the upload id to pass to the import / restore call. */
export async function uploadInChunks(file: File, onProgress?: (loaded: number, total: number) => void): Promise<string> {
  const CHUNK = 8 * 1024 * 1024;
  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  let offset = 0;
  do {
    const piece = file.slice(offset, offset + CHUNK);
    const last = offset + piece.size >= file.size;
    let lastError = "";
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(`/api/admin/upload-chunk?id=${id}&offset=${offset}${last ? "&last=1" : ""}`, { method: "POST", body: piece, headers: { "Content-Type": "application/octet-stream" } });
        const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
        if (res.ok && data.success) {
          lastError = "";
          break;
        }
        lastError = data.message || `Upload failed (${res.status}).`;
        if (res.status === 403 || res.status === 409) break;
      } catch {
        lastError = "Connection lost while uploading.";
      }
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (lastError) throw new Error(lastError);
    offset += piece.size;
    onProgress?.(offset, file.size);
  } while (offset < file.size);
  return id;
}
