import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { jsonError, jsonOk } from "@/lib/api";

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("file is required", 400);
    }

    if (file.size <= 0) {
      return jsonError("file is empty", 400);
    }

    if (file.size > MAX_BYTES) {
      return jsonError("file exceeds 10 MB limit", 400);
    }

    const originalName = file.name || "upload";
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return jsonError(
        `Unsupported file type. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
        400,
      );
    }

    const safeBase = originalName
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60);
    const filename = `${safeBase || "file"}-${randomUUID()}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);

    return jsonOk({ fileUrl: `/uploads/${filename}` }, 201);
  } catch (error) {
    console.error("POST /api/upload", error);
    return jsonError("Failed to upload file", 500);
  }
}
