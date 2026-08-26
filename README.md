# SynapseWeaver

Guided learning through a knowledge graph: start from a few nodes, add content, and (from M2) expand by discovering related topics. The product is **propose → review → confirm** — the user keeps editorial control.

## Overview

Milestone 1 delivers:

- A seeded default graph (study topic: machine learning)
- Interactive graph view (zoom, pan, drag, click-to-open)
- Node editing: title/summary plus TEXT, LINK, and DOCUMENT contents
- Light / dark / system theme via semantic Tailwind tokens

AI generation, dedup, and export land in later milestones.

## Architecture

| Layer | Choice |
| --- | --- |
| App | Next.js App Router (UI + API in one project) |
| UI | React, Tailwind CSS 4, `next-themes`, `react-force-graph-2d` |
| Data | PostgreSQL + pgvector, Prisma |
| Files | Stored under `public/uploads/`; DB keeps only `fileUrl` |

Key paths:

- `src/app/api/` — REST for graph, nodes, contents, upload
- `src/app/graph/`, `src/app/node/[id]/` — graph and node detail
- `src/lib/db/`, `src/lib/validation/` — Prisma client and Zod schemas
- `prisma/schema.prisma` — source of truth for the data model

## Setup

### Prerequisites

- Node.js 20+
- Docker (for local Postgres with pgvector)

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

`DATABASE_URL` defaults to the Docker Compose database. `GEMINI_API_KEY` is unused in M1.

### 3. Database

```bash
docker compose up -d
npx prisma migrate deploy
npx prisma db seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/graph`).

## Design notes

- **Single implicit graph** — no multi-graph or auth in M1.
- **Content types** — TEXT / LINK / DOCUMENT are editable; `AI_GENERATED` is reserved for M2+.
- **Theme** — colors live as CSS variables (`--accent` teal, slate neutrals) so branding can change in one place.
- **Files** — never stored as blobs in Postgres; only URLs.
