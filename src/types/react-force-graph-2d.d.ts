declare module "react-force-graph-2d" {
  import type { ComponentType, MutableRefObject } from "react";

  type NodeObject = {
    id?: string | number;
    x?: number;
    y?: number;
    [key: string]: unknown;
  };

  type LinkObject = {
    source?: string | number | NodeObject;
    target?: string | number | NodeObject;
    [key: string]: unknown;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ForceFn = any;

  type ForceGraphMethods = {
    d3Force(forceName: string): ForceFn | undefined;
    d3Force(forceName: string, forceFn: ForceFn | null): ForceGraphMethods;
    d3ReheatSimulation(): ForceGraphMethods;
    graph2ScreenCoords(x: number, y: number): { x: number; y: number };
    screen2GraphCoords(x: number, y: number): { x: number; y: number };
  };

  type ForceGraphProps = {
    width?: number;
    height?: number;
    graphData?: { nodes: NodeObject[]; links: LinkObject[] };
    backgroundColor?: string;
    nodeCanvasObject?: (
      node: NodeObject,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => void;
    nodePointerAreaPaint?: (
      node: NodeObject,
      color: string,
      ctx: CanvasRenderingContext2D,
    ) => void;
    linkColor?: (link: LinkObject) => string;
    linkWidth?: number | ((link: LinkObject) => number);
    onNodeClick?: (node: NodeObject, event: MouseEvent) => void;
    onNodeRightClick?: (node: NodeObject, event: MouseEvent) => void;
    onBackgroundClick?: (event: MouseEvent) => void;
    onBackgroundRightClick?: (event: MouseEvent) => void;
    cooldownTicks?: number;
    enableNodeDrag?: boolean;
    enableZoomInteraction?: boolean;
    enablePanInteraction?: boolean;
    ref?:
      | MutableRefObject<ForceGraphMethods | undefined>
      | ((instance: ForceGraphMethods | null) => void);
  };

  const ForceGraph2D: ComponentType<ForceGraphProps>;
  export type { ForceGraphMethods, ForceGraphProps, NodeObject, LinkObject };
  export default ForceGraph2D;
}

declare module "d3-force-3d" {
  export function forceCollide(radius?: number | ((node: unknown) => number)): {
    radius: {
      (): number | ((node: unknown) => number);
      (radius: number | ((node: unknown) => number)): unknown;
    };
    strength: {
      (): number;
      (strength: number): unknown;
    };
  };
}
