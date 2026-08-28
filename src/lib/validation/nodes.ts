import { z } from "zod";

export const createNodeSchema = z.object({
  graphId: z.string().uuid("graphId is required"),
  title: z.string().trim().min(1, "Title is required").max(200),
  summary: z.string().trim().max(2000).optional().nullable(),
});

export const updateNodeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(2000).optional().nullable(),
});

export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
