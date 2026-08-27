import path from "path";
import { jsonError, jsonOk } from "@/lib/api";
import {
  ALLOWED_EXTENSIONS,
  MAX_BYTES,
  blobTokenConfigured,
  putPublicBlob,
} from "@/lib/blob";

export async function POST(request: Request) {
  if (!blobTokenConfigured()) {
    return jsonError(
      "File storage is not configured (missing BLOB_READ_WRITE_TOKEN)",
      503,
    );
  }

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
    const pathname = `uploads/${safeBase || "file"}${ext}`;
    const fileUrl = await putPublicBlob(
      pathname,
      file,
      file.type || "application/octet-stream",
    );

    return jsonOk({ fileUrl }, 201);
  } catch (error) {
    console.error("POST /api/upload", error);
    return jsonError("Failed to upload file", 500);
  }
}
