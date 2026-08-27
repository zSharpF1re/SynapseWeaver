export async function uploadEditorFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const body = (await res.json()) as { fileUrl?: string; error?: string };
  if (!res.ok || !body.fileUrl) {
    throw new Error(body.error ?? "Upload failed");
  }
  return body.fileUrl;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}
