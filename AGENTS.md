# SynapseWeaver — agent rules

Guided learning via a knowledge graph: the user starts from a few nodes and expands by discovering related topics. The product is **propose → review → confirm**, not an auto-generated wiki. The user keeps editorial control.

Canonical docs: `DESIGN.md` (scope and milestones), `claude-project.md` (architecture, AI flows, security). `prisma/schema.prisma` is the source of truth for the current data model. Do not invent a parallel schema.

## Stack and layout

Next.js App Router + TypeScript, React, Tailwind. API routes in the same app — no separate backend. PostgreSQL + pgvector, Prisma. Graph UI: react-force-graph (or Sigma.js). Gemini for AI. Deploy target: Vercel.

Keep code in:

- `src/app/api/` — REST: nodes CRUD, `nodes/[id]/expand`, edges
- `src/app/graph/`, `src/app/node/[id]/` — graph view and node detail
- `src/lib/ai/` — Gemini calls, prompts, embeddings
- `src/lib/dedup/` — fuzzy + semantic match
- `src/lib/validation/` — Zod schemas for AI output and request bodies

## Data

`Node`, `Content`, and `Edge` stay separate. A node accumulates many contents over time. Edges record `generatedFromContentId` so a child can be traced to the content that produced it. Store uploaded files as URLs (`fileUrl`), never as blobs in Postgres.

MVP content types in the schema include TEXT, LINK, DOCUMENT, AI_GENERATED — implement editing for text/urls/files in v1; AI-generated body text is v2.

## AI (Gemini)

- Call Gemini **only from API routes / server code**. The client talks to our API, never to Gemini.
- Never put the Gemini key in client code or in any `NEXT_PUBLIC_*` variable. Use `.env.local` (gitignored) and commit `.env.example` with empty placeholders only.
- Validate all model output with Zod before use. Treat malformed output as a user-visible error, not as data to persist.
- Related-node generation: generate candidates → Zod → dedup → **show proposals** → persist only after confirm/edit/discard.
- Prompt context should include node title, existing contents, and nearby nodes (parent/siblings) when available.
- Rate-limit AI endpoints. Do not add a model-agnostic provider layer unless asked.

## Dedup (when generating related nodes)

Same-user graph only.

1. Fuzzy title match (case-insensitive).
2. Embedding cosine similarity (pgvector): high → link existing node; mid → ask the user; low → new node.

Do not auto-merge. Level-3 LLM verification is out of scope.

## UX and quality

Graph view needs zoom, drag, and click-to-open. Node detail is the editing surface. Loading and failure states for AI calls are required, not optional polish.

Portfolio bar: readable incremental commits, no secrets in git history, README covers setup and the main architecture choices.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
