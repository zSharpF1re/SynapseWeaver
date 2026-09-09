import { NodeEditor } from "@/components/graph/node-editor";
import type { NodePlacement, PlacementStatus } from "@/types/graph";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    placed?: string;
    neighbor?: string;
    neighborId?: string;
  }>;
};

function parsePlacement(query: {
  placed?: string;
  neighbor?: string;
  neighborId?: string;
}): NodePlacement | null {
  if (
    query.placed !== "linked" &&
    query.placed !== "orphan" &&
    query.placed !== "skipped"
  ) {
    return null;
  }
  const status: PlacementStatus = query.placed;
  return {
    status,
    neighborTitle: query.neighbor,
    neighborId: query.neighborId,
  };
}

export default async function NodePage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  return <NodeEditor nodeId={id} placement={parsePlacement(query)} />;
}
