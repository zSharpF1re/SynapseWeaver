import { z } from "zod";
import { isEmptyDoc, parseDocResult } from "@/lib/rich-text";

const tiptapTextSchema = z.string().superRefine((value, ctx) => {
  const parsed = parseDocResult(value);
  if (!parsed.ok) {
    ctx.addIssue({ code: "custom", message: parsed.error });
    return;
  }
  if (isEmptyDoc(parsed.doc)) {
    ctx.addIssue({ code: "custom", message: "Text is required" });
  }
});

const textContentSchema = z.object({
  type: z.literal("TEXT"),
  text: tiptapTextSchema,
  fileUrl: z.null().optional(),
});

const documentContentSchema = z.object({
  type: z.literal("DOCUMENT"),
  fileUrl: z.string().trim().min(1, "fileUrl is required"),
  text: z.string().trim().optional().nullable(),
});

export const createContentSchema = z.discriminatedUnion("type", [
  textContentSchema,
  documentContentSchema,
]);

export const updateContentSchema = z
  .object({
    text: z.string().optional().nullable(),
    fileUrl: z.string().trim().min(1).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export function parseTextBody(text: string) {
  const parsed = parseDocResult(text);
  if (!parsed.ok) return parsed;
  if (isEmptyDoc(parsed.doc)) {
    return { ok: false as const, error: "Text is required" };
  }
  return parsed;
}

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
