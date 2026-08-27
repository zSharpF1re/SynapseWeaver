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
  type: "TEXT" | "DOCUMENT" | "AI_GENERATED";
  text: string | null;
  fileUrl: string | null;
  createdAt: string;
};

export type NodeDetail = GraphNode & {
  contents: ContentDto[];
};

export type ExpandProposalAction = "new" | "link" | "ask";

export type ExpandProposal = {
  title: string;
  summary: string;
  relation: string;
  action: ExpandProposalAction;
  existingNodeId?: string;
  similarity?: number;
  matchTitle?: string;
};

export type ExpandResponse = {
  proposals: ExpandProposal[];
  contentHash: string;
  cached: boolean;
};

export type ConfirmCreatedNode = {
  id: string;
  title: string;
  summary: string | null;
};

export type ConfirmLinkedEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
};

export type ConfirmResponse = {
  created: ConfirmCreatedNode[];
  linked: ConfirmLinkedEdge[];
};
