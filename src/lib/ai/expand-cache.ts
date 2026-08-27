import type { ExpandProposal } from "@/types/graph";

const TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
  proposals: ExpandProposal[];
  contentHash: string;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function key(nodeId: string, contentHash: string) {
  return `${nodeId}:${contentHash}`;
}

export function getExpandCache(
  nodeId: string,
  contentHash: string,
): ExpandProposal[] | null {
  const entry = cache.get(key(nodeId, contentHash));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key(nodeId, contentHash));
    return null;
  }
  return entry.proposals;
}

export function setExpandCache(
  nodeId: string,
  contentHash: string,
  proposals: ExpandProposal[],
): void {
  cache.set(key(nodeId, contentHash), {
    proposals,
    contentHash,
    expiresAt: Date.now() + TTL_MS,
  });
}
