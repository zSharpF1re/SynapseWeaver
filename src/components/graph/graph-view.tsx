"use client";

import dynamic from "next/dynamic";
import { forceCollide } from "d3-force-3d";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { GraphForceSettingsPanel } from "@/components/graph/graph-force-settings";
import {
  DEFAULT_GRAPH_FORCES,
  loadGraphForces,
  type GraphForceSettings,
} from "@/lib/graph-forces";
import type { GraphPayload } from "@/types/graph";

// h-full does NOT work, use h-[100dvh] instead
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[95dvh] items-center justify-center text-sm text-muted-foreground">
      Loading graph…
    </div>
  ),
});

type ThemeColors = {
  background: string;
  foreground: string;
  accent: string;
  mutedForeground: string;
  border: string;
};

function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement);
  return {
    background: styles.getPropertyValue("--background").trim() || "#f6f5f2",
    foreground: styles.getPropertyValue("--foreground").trim() || "#1a1916",
    accent: styles.getPropertyValue("--accent").trim() || "#3b5bdb",
    mutedForeground:
      styles.getPropertyValue("--muted-foreground").trim() || "#6b6860",
    border: styles.getPropertyValue("--border").trim() || "#ddd8ce",
  };
}

type GraphNodeObj = {
  id: string;
  title: string;
  summary: string | null;
  x?: number;
  y?: number;
};

type GraphLinkObj = {
  id: string;
  source: string | GraphNodeObj;
  target: string | GraphNodeObj;
  weight: number;
};

type GraphViewProps = {
  data: GraphPayload;
  selectedNodeId: string | null;
  connectingFromId?: string | null;
  onNodeSelect: (nodeId: string) => void;
  onBackgroundClick?: () => void;
  onNodeRightClick?: (nodeId: string, event: MouseEvent) => void;
  onBackgroundRightClick?: (event: MouseEvent) => void;
  onConnectTarget?: (nodeId: string) => void;
  onConnectCancel?: () => void;
};

export function GraphView({
  data,
  selectedNodeId,
  connectingFromId = null,
  onNodeSelect,
  onBackgroundClick,
  onNodeRightClick,
  onBackgroundRightClick,
  onConnectTarget,
  onConnectCancel,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [colors, setColors] = useState<ThemeColors | null>(null);
  const [forces, setForces] = useState<GraphForceSettings>(DEFAULT_GRAPH_FORCES);
  const [forcesReady, setForcesReady] = useState(false);
  const [graphReady, setGraphReady] = useState(false);

  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
      })),
      links: data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        weight: e.weight,
      })),
    }),
    [data],
  );

  useEffect(() => {
    setForces(loadGraphForces());
    setForcesReady(true);
  }, []);

  useEffect(() => {
    setColors(readThemeColors());

    const observer = new MutationObserver(() => {
      setColors(readThemeColors());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bindGraphRef = useCallback((fg: ForceGraphMethods | null) => {
    fgRef.current = fg ?? undefined;
    setGraphReady(Boolean(fg));
  }, []);

  const connectLineRef = useRef<SVGLineElement>(null);
  const nodePosRef = useRef(new Map<string, { x: number; y: number }>());

  useEffect(() => {
    if (!connectingFromId) return;
    const sourceId = connectingFromId;

    const el = containerRef.current;
    if (!el) return;

    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let cancelled = false;

    function readPointer(event: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function tick() {
      if (cancelled) return;
      const fg = fgRef.current;
      const line = connectLineRef.current;
      const pos = nodePosRef.current.get(sourceId);
      if (fg?.graph2ScreenCoords && line && pointer && pos) {
        const from = fg.graph2ScreenCoords(pos.x, pos.y);
        line.setAttribute("x1", String(from.x));
        line.setAttribute("y1", String(from.y));
        line.setAttribute("x2", String(pointer.x));
        line.setAttribute("y2", String(pointer.y));
        line.style.visibility = "visible";
      }
      raf = window.requestAnimationFrame(tick);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onConnectCancel?.();
    }

    window.addEventListener("pointermove", readPointer);
    document.addEventListener("keydown", onKey, true);
    tick();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", readPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [connectingFromId, onConnectCancel]);

  const applyForces = useCallback((settings: GraphForceSettings) => {
    const fg = fgRef.current;
    if (!fg) return false;

    const charge = fg.d3Force("charge");
    const link = fg.d3Force("link");
    if (!charge?.strength || !link?.distance || !link?.strength) {
      return false;
    }

    charge.strength(-settings.repulsion);
    link.distance(settings.linkDistance);
    link.strength(settings.attraction);

    const collide = forceCollide(settings.minDistance);
    collide.strength(1);
    fg.d3Force("collide", collide);

    fg.d3ReheatSimulation();
    return true;
  }, []);

  useEffect(() => {
    if (!graphReady || !forcesReady) return;

    let cancelled = false;
    let attempts = 0;
    let raf = 0;

    const tryApply = () => {
      if (cancelled) return;
      if (applyForces(forces)) return;
      attempts += 1;
      if (attempts < 60) {
        raf = window.requestAnimationFrame(tryApply);
      }
    };

    tryApply();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [forces, forcesReady, graphReady, applyForces, graphData]);

  const paintNode = useCallback(
    (
      node: {
        id?: string | number;
        x?: number;
        y?: number;
        [key: string]: unknown;
      },
      ctx: CanvasRenderingContext2D,
      _globalScale: number,
    ) => {
      if (!colors || node.x == null || node.y == null) return;
      if (node.id != null) {
        nodePosRef.current.set(String(node.id), { x: node.x, y: node.y });
      }
      const title =
        typeof node.title === "string" ? node.title : String(node.id ?? "");
      const isSelected =
        String(node.id) === selectedNodeId ||
        String(node.id) === connectingFromId;
      const radius = isSelected ? 10 : 8;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = colors.accent;
      ctx.fill();
      ctx.strokeStyle = isSelected ? colors.foreground : colors.background;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      ctx.font = isSelected ? "bold 12px sans-serif" : "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = colors.foreground;
      ctx.fillText(title, node.x, node.y + radius + 4);
    },
    [colors, selectedNodeId, connectingFromId],
  );

  return (
    <div className="relative h-[95dvh]">
    <div
      ref={containerRef}
      className={`h-full w-full bg-background ${connectingFromId ? "cursor-crosshair" : ""}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      {colors && (
        <ForceGraph2D
          ref={bindGraphRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor={colors.background}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNodeObj & { x?: number; y?: number };
            if (n.x == null || n.y == null) return;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 12, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={() => colors.border}
          linkWidth={(link) => Math.max(1, (link as GraphLinkObj).weight)}
          onNodeClick={(node) => {
            const id = (node as GraphNodeObj).id;
            if (!id) return;
            if (connectingFromId) {
              if (id === connectingFromId) {
                onConnectCancel?.();
                return;
              }
              onConnectTarget?.(id);
              return;
            }
            onNodeSelect(id);
          }}
          onNodeRightClick={(node, event) => {
            event.preventDefault();
            const id = (node as GraphNodeObj).id;
            if (id) onNodeRightClick?.(id, event);
          }}
          onBackgroundClick={(event) => {
            if (typeof event.button === "number" && event.button !== 0) return;
            if (connectingFromId) {
              onConnectCancel?.();
              return;
            }
            onBackgroundClick?.();
          }}
          onBackgroundRightClick={(event) => {
            event.preventDefault();
            if (connectingFromId) {
              onConnectCancel?.();
              return;
            }
            onBackgroundRightClick?.(event);
          }}
          cooldownTicks={80}
          enableNodeDrag={!connectingFromId}
          enableZoomInteraction
          enablePanInteraction
        />
      )}
      {connectingFromId && colors && (
        <svg
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          aria-hidden
        >
          <line
            ref={connectLineRef}
            x1={0}
            y1={0}
            x2={0}
            y2={0}
            stroke={colors.accent}
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinecap="round"
            style={{ visibility: "hidden" }}
          />
        </svg>
      )}
      {connectingFromId && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          Click a node to connect · Esc to cancel
        </p>
      )}
    </div>
      {forcesReady && (
        <GraphForceSettingsPanel value={forces} onChange={setForces} />
      )}
    </div>

  );
}
