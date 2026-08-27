export type FuzzyMatch = {
  id: string;
  title: string;
  score: number;
};

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function fuzzyMatchTitle(
  candidate: string,
  nodes: Array<{ id: string; title: string }>,
): FuzzyMatch | null {
  const needle = normalizeTitle(candidate);
  if (!needle) return null;

  let best: FuzzyMatch | null = null;
  for (const node of nodes) {
    const other = normalizeTitle(node.title);
    if (!other) continue;
    if (other === needle) {
      return { id: node.id, title: node.title, score: 1 };
    }
    const maxLen = Math.max(needle.length, other.length);
    const ratio = 1 - levenshtein(needle, other) / maxLen;
    if (ratio >= 0.9 && (!best || ratio > best.score)) {
      best = { id: node.id, title: node.title, score: ratio };
    }
  }
  return best;
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[] = new Array(cols);
  for (let j = 0; j < cols; j += 1) dp[j] = j;

  for (let i = 1; i < rows; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[b.length];
}
