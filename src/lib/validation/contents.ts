import { z } from "zod";

const textContentSchema = z.object({
  type: z.literal("TEXT"),
  text: z.string().trim().min(1, "Text is required"),
  url: z.null().optional(),
  fileUrl: z.null().optional(),
});

const linkContentSchema = z.object({
  type: z.literal("LINK"),
  url: z.url("A valid URL is required"),
  text: z.string().trim().optional().nullable(),
  fileUrl: z.null().optional(),
});

const documentContentSchema = z.object({
  type: z.literal("DOCUMENT"),
  fileUrl: z.string().trim().min(1, "fileUrl is required"),
  text: z.string().trim().optional().nullable(),
  url: z.null().optional(),
});

export const createContentSchema = z.discriminatedUnion("type", [
  textContentSchema,
  linkContentSchema,
  documentContentSchema,
]);

export const updateContentSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    url: z.url().optional().nullable(),
    fileUrl: z.string().trim().min(1).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
