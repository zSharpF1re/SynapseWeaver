export type GraphForceSettings = {
  /** Positive UI intensity; applied as negative charge strength */
  repulsion: number;
  minDistance: number;
  linkDistance: number;
  /** Link spring strength 0–1 */
  attraction: number;
};

export const DEFAULT_GRAPH_FORCES: GraphForceSettings = {
  repulsion: 120,
  minDistance: 18,
  linkDistance: 100,
  attraction: 0.4,
};

export const GRAPH_FORCES_STORAGE_KEY = "synapseweaver.graphForces";

export function loadGraphForces(): GraphForceSettings {
  if (typeof window === "undefined") return DEFAULT_GRAPH_FORCES;
  try {
    const raw = window.localStorage.getItem(GRAPH_FORCES_STORAGE_KEY);
    if (!raw) return DEFAULT_GRAPH_FORCES;
    const parsed = JSON.parse(raw) as Partial<GraphForceSettings>;
    return {
      repulsion: clamp(Number(parsed.repulsion), 30, 800, DEFAULT_GRAPH_FORCES.repulsion),
      minDistance: clamp(
        Number(parsed.minDistance),
        4,
        80,
        DEFAULT_GRAPH_FORCES.minDistance,
      ),
      linkDistance: clamp(
        Number(parsed.linkDistance),
        20,
        300,
        DEFAULT_GRAPH_FORCES.linkDistance,
      ),
      attraction: clamp(
        Number(parsed.attraction),
        0.05,
        1,
        DEFAULT_GRAPH_FORCES.attraction,
      ),
    };
  } catch {
    return DEFAULT_GRAPH_FORCES;
  }
}

export function saveGraphForces(settings: GraphForceSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GRAPH_FORCES_STORAGE_KEY, JSON.stringify(settings));
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
