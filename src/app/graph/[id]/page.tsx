import { GraphPageClient } from "@/components/graph/graph-page-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GraphCanvasPage({ params }: Props) {
  const { id } = await params;
  return <GraphPageClient graphId={id} />;
}
