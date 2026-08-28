import { z } from "zod";
import {
  isHttpUrl,
  MAX_DOC_CHARS,
  parseDocResult,
  collectImageSrcs,
} from "@/lib/rich-text";

export const GRAPH_NAME_MAX = 200;
export const GRAPH_NOTES_MAX = 10_000;
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
export const MAX_IMPORT_NODES = 5_000;
export const MAX_IMPORT_EDGES = 20_000;

export const createGraphSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(GRAPH_NAME_MAX),
  notes: z.string().trim().max(GRAPH_NOTES_MAX).optional().nullable(),
});

export const updateGraphSchema = z.object({
  name: z.string().trim().min(1).max(GRAPH_NAME_MAX).optional(),
  notes: z.string().trim().max(GRAPH_NOTES_MAX).optional().nullable(),
});

const fileIdSchema = z.string().trim().min(1).max(80);

const importContentSchema = z
  .object({
    id: fileIdSchema,
    type: z.enum(["TEXT", "DOCUMENT", "AI_GENERATED"]),
    text: z.string().max(MAX_DOC_CHARS).nullable().optional(),
    fileUrl: z.string().trim().max(2000).nullable().optional(),
    createdAt: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fileUrl && !isHttpUrl(value.fileUrl)) {
      ctx.addIssue({
        code: "custom",
        message: "fileUrl must be an http or https URL",
        path: ["fileUrl"],
      });
    }

    if (value.type === "DOCUMENT") {
      if (!value.fileUrl) {
        ctx.addIssue({
          code: "custom",
          message: "DOCUMENT content requires fileUrl",
          path: ["fileUrl"],
        });
      }
      return;
    }

    if (value.type === "TEXT") {
      if (!value.text) {
        ctx.addIssue({
          code: "custom",
          message: "TEXT content requires text",
          path: ["text"],
        });
        return;
      }
      assertImportDoc(value.text, ctx);
      return;
    }

    if (value.text) {
      assertImportDoc(value.text, ctx);
    }
  });

const importNodeSchema = z.object({
  id: fileIdSchema,
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(2000).nullable().optional(),
  createdAt: z.string().optional(),
  contents: z.array(importContentSchema).max(200),
});

const importEdgeSchema = z.object({
  id: fileIdSchema.optional(),
  source: fileIdSchema,
  target: fileIdSchema,
  weight: z.number().finite().min(0).max(100).optional(),
  generatedFromContentId: fileIdSchema.nullable().optional(),
  createdAt: z.string().optional(),
});

export const graphExportSchema = z
  .object({
    format: z.literal("synapseweaver-graph"),
    version: z.literal(1),
    exportedAt: z.string().optional(),
    graph: z.object({
      name: z.string().trim().min(1).max(GRAPH_NAME_MAX),
      notes: z.string().trim().max(GRAPH_NOTES_MAX).nullable().optional(),
      createdAt: z.string().optional(),
    }),
    nodes: z.array(importNodeSchema).max(MAX_IMPORT_NODES),
    edges: z.array(importEdgeSchema).max(MAX_IMPORT_EDGES),
  })
  .superRefine((value, ctx) => {
    const nodeIds = new Set<string>();
    for (const [index, node] of value.nodes.entries()) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate node id",
          path: ["nodes", index, "id"],
        });
      }
      nodeIds.add(node.id);
    }

    const contentIds = new Set<string>();
    for (const [nodeIndex, node] of value.nodes.entries()) {
      for (const [contentIndex, content] of node.contents.entries()) {
        if (contentIds.has(content.id)) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate content id",
            path: ["nodes", nodeIndex, "contents", contentIndex, "id"],
          });
        }
        contentIds.add(content.id);
      }
    }

    for (const [index, edge] of value.edges.entries()) {
      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({
          code: "custom",
          message: "Edge source is not in this graph",
          path: ["edges", index, "source"],
        });
      }
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: "custom",
          message: "Edge target is not in this graph",
          path: ["edges", index, "target"],
        });
      }
      if (
        edge.generatedFromContentId &&
        !contentIds.has(edge.generatedFromContentId)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "generatedFromContentId is not in this graph",
          path: ["edges", index, "generatedFromContentId"],
        });
      }
    }
  });

function assertImportDoc(
  text: string,
  ctx: z.RefinementCtx,
) {
  const parsed = parseDocResult(text);
  if (!parsed.ok) {
    ctx.addIssue({ code: "custom", message: parsed.error, path: ["text"] });
    return;
  }
  for (const src of collectImageSrcs(parsed.doc)) {
    if (!isHttpUrl(src)) {
      ctx.addIssue({
        code: "custom",
        message: "Image src must be an http or https URL",
        path: ["text"],
      });
      return;
    }
  }
}

export type CreateGraphInput = z.infer<typeof createGraphSchema>;
export type UpdateGraphInput = z.infer<typeof updateGraphSchema>;
export type GraphExportInput = z.infer<typeof graphExportSchema>;
