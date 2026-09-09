import { z } from "zod";

export const createEdgeSchema = z
  .object({
    sourceNodeId: z.string().uuid("sourceNodeId is required"),
    targetNodeId: z.string().uuid("targetNodeId is required"),
  })
  .refine((data) => data.sourceNodeId !== data.targetNodeId, {
    message: "Cannot connect a node to itself",
  });

export type CreateEdgeInput = z.infer<typeof createEdgeSchema>;
