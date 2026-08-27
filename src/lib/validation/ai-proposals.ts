import { z } from "zod";

export const geminiRelatedNodeSchema = z.object({
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(200),
  relation: z.string().trim().min(1).max(40),
});

export const geminiRelatedOutputSchema = z.object({
  nodes: z.array(geminiRelatedNodeSchema).min(1).max(5),
});

export const relatedNodeJsonSchema = {
  type: "object",
  properties: {
    nodes: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 80 },
          summary: { type: "string", maxLength: 200 },
          relation: { type: "string", maxLength: 40 },
        },
        required: ["title", "summary", "relation"],
      },
    },
  },
  required: ["nodes"],
} as const;

export const expandRequestSchema = z.object({
  contentId: z.string().uuid().optional().nullable(),
});

export const confirmAcceptedSchema = z.object({
  action: z.enum(["new", "link"]),
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().max(200).optional().nullable(),
  relation: z.string().trim().max(40).optional().nullable(),
  existingNodeId: z.string().uuid().optional().nullable(),
});

export const confirmRequestSchema = z.object({
  contentId: z.string().uuid().optional().nullable(),
  contentHash: z.string().trim().min(1).max(128).optional(),
  accepted: z.array(confirmAcceptedSchema).min(1).max(5),
});

export type GeminiRelatedNode = z.infer<typeof geminiRelatedNodeSchema>;
export type ExpandRequestInput = z.infer<typeof expandRequestSchema>;
export type ConfirmRequestInput = z.infer<typeof confirmRequestSchema>;
export type ConfirmAcceptedInput = z.infer<typeof confirmAcceptedSchema>;
