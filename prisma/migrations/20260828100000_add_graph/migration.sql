-- CreateTable
CREATE TABLE "Graph" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Graph_pkey" PRIMARY KEY ("id")
);

-- Existing nodes belong to a default graph after this migration.
INSERT INTO "Graph" ("id", "name", "notes", "createdAt", "updatedAt")
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Machine learning foundations',
    'Starter graph for exploring AI and machine learning fundamentals.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- AlterTable
ALTER TABLE "Node" ADD COLUMN "graphId" TEXT;

UPDATE "Node" SET "graphId" = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

ALTER TABLE "Node" ALTER COLUMN "graphId" SET NOT NULL;

CREATE INDEX "Node_graphId_idx" ON "Node"("graphId");

ALTER TABLE "Node" ADD CONSTRAINT "Node_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "Graph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cascade node/content/edge deletes so a graph can be removed in one step.
ALTER TABLE "Content" DROP CONSTRAINT "Content_nodeId_fkey";
ALTER TABLE "Content" ADD CONSTRAINT "Content_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Edge" DROP CONSTRAINT "Edge_sourceNodeId_fkey";
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Edge" DROP CONSTRAINT "Edge_targetNodeId_fkey";
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
