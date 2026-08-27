import type { ContentDto } from "@/types/graph";

export const contentSelect = {
  id: true,
  nodeId: true,
  type: true,
  text: true,
  fileUrl: true,
  createdAt: true,
} as const;

export function toContentDto(content: {
  id: string;
  nodeId: string;
  type: ContentDto["type"];
  text: string | null;
  fileUrl: string | null;
  createdAt: Date;
}): ContentDto {
  return {
    id: content.id,
    nodeId: content.nodeId,
    type: content.type,
    text: content.text,
    fileUrl: content.fileUrl,
    createdAt: content.createdAt.toISOString(),
  };
}
