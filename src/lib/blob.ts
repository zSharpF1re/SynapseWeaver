import { del, put } from "@vercel/blob";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".doc",
  ".docx",
]);

export { ALLOWED_EXTENSIONS, MAX_BYTES };

export function blobTokenConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function putPublicBlob(
  pathname: string,
  body: File | Buffer,
  contentType?: string,
): Promise<string> {
  const blob = await put(pathname, body, {
    access: "public",
    addRandomSuffix: true,
    ...(contentType ? { contentType } : {}),
  });
  return blob.url;
}

export async function deleteBlobIfPresent(
  fileUrl: string | null | undefined,
): Promise<void> {
  if (!fileUrl) return;
  if (!blobTokenConfigured()) return;
  try {
    await del(fileUrl);
  } catch (error) {
    console.error("Failed to delete blob", fileUrl, error);
  }
}
