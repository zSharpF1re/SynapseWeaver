import { prisma } from "@/lib/db/prisma";
import { EMBED_DIMENSIONS } from "@/lib/ai/gemini";

type SqlClient = {
  $executeRawUnsafe: (
    query: string,
    ...values: unknown[]
  ) => Promise<unknown>;
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
};

const db = () => prisma as unknown as SqlClient;

export type StoredNodeVector = {
  id: string;
  title: string;
  values: number[];
};

export function toVectorLiteral(values: number[]): string {
  if (values.length !== EMBED_DIMENSIONS) {
    throw new Error(`Embedding must have ${EMBED_DIMENSIONS} dimensions`);
  }
  return `[${values.join(",")}]`;
}

export function parseVector(text: string): number[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed) || parsed.some((n) => typeof n !== "number")) {
    throw new Error("Invalid vector payload");
  }
  return parsed;
}

export async function listNodesMissingEmbeddings(): Promise<
  Array<{ id: string; title: string; summary: string | null }>
> {
  return db().$queryRawUnsafe(
    `SELECT id, title, summary FROM "Node" WHERE embedding IS NULL`,
  );
}

export async function listStoredVectors(): Promise<StoredNodeVector[]> {
  const rows = await db().$queryRawUnsafe<
    Array<{ id: string; title: string; embedding: string }>
  >(`SELECT id, title, embedding::text AS embedding FROM "Node" WHERE embedding IS NOT NULL`);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    values: parseVector(row.embedding),
  }));
}

export async function setNodeEmbedding(
  client: SqlClient,
  nodeId: string,
  values: number[],
): Promise<void> {
  await client.$executeRawUnsafe(
    `UPDATE "Node" SET embedding = $1::vector WHERE id = $2`,
    toVectorLiteral(values),
    nodeId,
  );
}

export async function setNodeEmbeddings(
  pairs: Array<{ id: string; values: number[] }>,
): Promise<void> {
  for (const pair of pairs) {
    await setNodeEmbedding(db(), pair.id, pair.values);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
