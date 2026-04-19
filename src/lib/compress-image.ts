/**
 * Client-side image/document compression before upload.
 *
 * - Images (jpeg/png/webp): downscaled to fit within MAX_DIM and re-encoded
 *   as JPEG at the configured quality. Typical ~70-85% size reduction.
 * - PDFs and other docs: returned unchanged (browser cannot recompress PDFs
 *   reliably; do that server-side if needed).
 *
 * Skips compression entirely when the file is already smaller than MIN_BYTES.
 */
const MAX_DIM = 1600;          // Max width/height in pixels
const QUALITY = 0.75;          // JPEG quality (0..1)
const MIN_BYTES = 300 * 1024;  // Don't bother compressing files <300KB

const COMPRESSIBLE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function compressIfImage(file: File): Promise<File> {
  if (!COMPRESSIBLE_TYPES.has(file.type)) return file;
  if (file.size < MIN_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file; // skip if no gain

    const newName = file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
