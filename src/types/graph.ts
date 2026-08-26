export type GraphNode = {
  id: string;
  title: string;
  summary: string | null;
  createdAt: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  generatedFromContentId: string | null;
};

export type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type ContentDto = {
  id: string;
  nodeId: string;
  type: "TEXT" | "LINK" | "DOCUMENT" | "AI_GENERATED";
  text: string | null;
  url: string | null;
  fileUrl: string | null;
  createdAt: string;
};

export type NodeDetail = GraphNode & {
  contents: ContentDto[];
};
