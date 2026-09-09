import { NodeEditor } from "@/components/graph/node-editor";

type Props = {
  searchParams: Promise<{ from?: string; graphId?: string; place?: string }>;
};

export default async function NewNodePage({ searchParams }: Props) {
  const { from, graphId, place } = await searchParams;
  return (
    <NodeEditor
      graphId={graphId || undefined}
      sourceNodeId={from || undefined}
      place={place === "1" || place === "true"}
    />
  );
}
