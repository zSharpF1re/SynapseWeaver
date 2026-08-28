"use client";

import {
  faDownload,
  faPlus,
  faRotate,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useCallback, useEffect, useState } from "react";
import { GraphView } from "@/components/graph/graph-view";
import { CreateNodeForm } from "@/components/graph/create-node-form";
import { NodeSidebar } from "@/components/graph/node-sidebar";
import { Card } from "@/components/ui/card";
import { FontAwesomeIcon } from "@/components/ui/icon";
import type { GraphPayload } from "@/types/graph";

export function GraphPageClient({ graphId }: { graphId: string }) {
  const [data, setData] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`/api/graphs/${graphId}`);
        const body = await res.json();
        if (!res.ok) {
          if (!opts?.silent) {
            setError(body.error ?? "Failed to load graph");
            setData(null);
          }
          return;
        }
        setData(body as GraphPayload);
      } catch {
        if (!opts?.silent) {
          setError("Network error while loading graph");
          setData(null);
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [graphId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const empty = data && data.nodes.length === 0;
  const graphName = data?.graph.name;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          <FontAwesomeIcon icon={showCreate ? faXmark : faPlus} />
          {showCreate ? "Close" : "New node"}
        </button>
        <a
          href={`/api/graphs/${graphId}/export`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          <FontAwesomeIcon icon={faDownload} />
          Export
        </a>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          <FontAwesomeIcon icon={faRotate} spin={loading} />
          Refresh
        </button>
      </div>

      {graphName && data && data.nodes.length > 0 && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-xs">
          <p className="truncate rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm">
            {graphName}
          </p>
        </div>
      )}

      {showCreate && (
        <Card className="absolute left-4 top-16 z-10 w-80">
          <h2 className="mb-3 text-sm font-semibold">Create node</h2>
          <CreateNodeForm
            graphId={graphId}
            onCreated={() => {
              setShowCreate(false);
              void load();
            }}
          />
        </Card>
      )}

      {loading && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading graph…
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && empty && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div>
            <h1 className="text-lg font-semibold">
              {graphName ? `${graphName} is empty` : "Your graph is empty"}
            </h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Create a starting node to begin mapping this topic.
            </p>
          </div>
          <Card className="w-full max-w-sm text-left">
            <CreateNodeForm graphId={graphId} onCreated={() => void load()} />
          </Card>
        </div>
      )}

      {!loading && !error && data && data.nodes.length > 0 && (
        <>
          <GraphView
            data={data}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onBackgroundClick={() => setSelectedNodeId(null)}
          />
          {selectedNodeId && (
            <NodeSidebar
              key={selectedNodeId}
              nodeId={selectedNodeId}
              onClose={() => setSelectedNodeId(null)}
              onGraphChanged={() => void load({ silent: true })}
            />
          )}
        </>
      )}
    </div>
  );
}
