import { NodeEditor } from "@/components/graph/node-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function NodePage({ params }: Props) {
  const { id } = await params;
  return <NodeEditor nodeId={id} />;
}
