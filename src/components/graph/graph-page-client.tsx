"use client";

import {
  faArrowDown,
  faDownload,
  faEye,
  faLink,
  faPen,
  faPlus,
  faRotate,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GraphView } from "@/components/graph/graph-view";
import { NodeSidebar } from "@/components/graph/node-sidebar";
import {
  ContextMenu,
  type ContextMenuItem,
} from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@/components/ui/icon";
import type { GraphPayload } from "@/types/graph";

const toolbarBtn =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted";

export function GraphPageClient({ graphId }: { graphId: string }) {
  const router = useRouter();
  const [data, setData] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

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

  const closeMenu = useCallback(() => setMenu(null), []);
  const cancelConnect = useCallback(() => setConnectingFromId(null), []);

  const connectToNode = useCallback(
    async (targetNodeId: string) => {
      if (!connectingFromId) return;
      try {
        const res = await fetch("/api/edges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceNodeId: connectingFromId,
            targetNodeId,
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          window.alert(body.error ?? "Failed to create connection");
          return;
        }
        setConnectingFromId(null);
        await load({ silent: true });
      } catch {
        window.alert("Network error while creating connection");
      }
    },
    [connectingFromId, load],
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      if (!confirm("Delete this node and its contents?")) return;
      try {
        const res = await fetch(`/api/nodes/${nodeId}`, { method: "DELETE" });
        const body = await res.json();
        if (!res.ok) {
          window.alert(body.error ?? "Failed to delete node");
          return;
        }
        setSelectedNodeId((current) => (current === nodeId ? null : current));
        await load({ silent: true });
      } catch {
        window.alert("Network error while deleting node");
      }
    },
    [load],
  );

  const menuItems: ContextMenuItem[] = useMemo(() => {
    if (!menu) return [];
    const nodeId = menu.nodeId;
    return [
      {
        type: "item",
        id: "open",
        label: "Open",
        icon: faEye,
        onSelect: () => setSelectedNodeId(nodeId),
      },
      {
        type: "item",
        id: "add-connected",
        label: "Add connected node",
        icon: faPlus,
        onSelect: () =>
          router.push(`/node/new?from=${nodeId}&graphId=${graphId}`),
      },
      {
        type: "item",
        id: "connect",
        label: "Connect",
        icon: faLink,
        onSelect: () => {
          setSelectedNodeId(null);
          setConnectingFromId(nodeId);
        },
      },
      {
        type: "item",
        id: "edit",
        label: "Edit",
        icon: faPen,
        onSelect: () => router.push(`/node/${nodeId}`),
      },
      { type: "separator" },
      {
        type: "item",
        id: "delete",
        label: "Delete",
        icon: faTrash,
        variant: "danger",
        onSelect: () => {
          void deleteNode(nodeId);
        },
      },
    ];
  }, [deleteNode, graphId, menu, router]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <Link href={`/node/new?graphId=${graphId}`} className={toolbarBtn}>
          <FontAwesomeIcon icon={faPlus} />
          New node
        </Link>
        <Link
          href={`/node/new?graphId=${graphId}&place=1`}
          className={toolbarBtn}
        >
          <FontAwesomeIcon icon={faArrowDown} />
          Drop in
        </Link>
        <a href={`/api/graphs/${graphId}/export`} className={toolbarBtn}>
          <FontAwesomeIcon icon={faDownload} />
          Export
        </a>
        <button
          type="button"
          onClick={() => void load()}
          className={toolbarBtn}
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
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href={`/node/new?graphId=${graphId}`} className={toolbarBtn}>
              <FontAwesomeIcon icon={faPlus} />
              New node
            </Link>
            <Link
              href={`/node/new?graphId=${graphId}&place=1`}
              className={toolbarBtn}
            >
              <FontAwesomeIcon icon={faArrowDown} />
              Drop in
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && data && data.nodes.length > 0 && (
        <>
          <GraphView
            data={data}
            selectedNodeId={selectedNodeId}
            connectingFromId={connectingFromId}
            onNodeSelect={(id) => {
              closeMenu();
              setSelectedNodeId(id);
            }}
            onBackgroundClick={() => {
              closeMenu();
              setSelectedNodeId(null);
            }}
            onNodeRightClick={(id, event) => {
              cancelConnect();
              setMenu({ nodeId: id, x: event.clientX, y: event.clientY });
            }}
            onBackgroundRightClick={() => {
              cancelConnect();
              closeMenu();
            }}
            onConnectTarget={(id) => {
              void connectToNode(id);
            }}
            onConnectCancel={cancelConnect}
          />
          {selectedNodeId && (
            <NodeSidebar
              key={selectedNodeId}
              nodeId={selectedNodeId}
              onClose={() => setSelectedNodeId(null)}
              onGraphChanged={() => void load({ silent: true })}
            />
          )}
          {menu && (
            <ContextMenu
              key={`${menu.nodeId}-${menu.x}-${menu.y}`}
              x={menu.x}
              y={menu.y}
              items={menuItems}
              onClose={closeMenu}
              ariaLabel="Node actions"
            />
          )}
        </>
      )}
    </div>
  );
}
