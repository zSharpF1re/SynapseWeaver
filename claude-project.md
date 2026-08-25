# Knowledge Graph — Documento di Progetto

Riferimento unico per inizializzare, sviluppare e completare il progetto.

---

## 1. Panoramica

**Concept:** applicazione web ispirata alla vista a grafo di Obsidian, orientata all'apprendimento guidato. L'utente parte da alcuni nodi (categorie/argomenti) e li esplora aggiungendo contenuti (testo, in futuro link/documenti); un modello AI analizza quel contenuto e propone nuovi nodi collegati semanticamente, aiutando a scoprire argomenti correlati senza dover sapere in anticipo "cosa cercare dopo".

**Problema che risolve:** esplorare un dominio nuovo è difficile perché non si sa cosa non si sa. La generazione di nodi contestuali risolve questo blocco, mantenendo però il controllo editoriale in mano all'utente — non è un wiki generato in automatico, è costruito insieme all'AI (proposta → revisione → conferma).

**Target:** progetto da portfolio, livello intermedio. Dimostra uso reale dell'AI applicata (non un layer estetico), gestione di uno stato a grafo, e buone pratiche di architettura/sicurezza.

---

## 2. Funzionalità core (scope MVP)

- [ ] Creazione manuale di nodi (titolo + breve descrizione)
- [ ] Aggiunta di contenuto testuale libero a un nodo
- [ ] Generazione AI di nodi figli a partire dal contenuto di un nodo
- [ ] Deduplicazione dei nodi generati (almeno Livello 1 + 2, vedi sez. 6)
- [ ] Conferma/modifica/scarto dei nodi proposti dall'AI prima di salvarli
- [ ] Vista a grafo interattiva (zoom, drag, click sui nodi)
- [ ] Pannello di dettaglio/editing per singolo nodo
- [ ] Bottone "Approfondisci" — nota generata dall'AI, con revisione utente prima del salvataggio

**Fuori scope per l'MVP (roadmap futura):**
- Contenuti di tipo LINK e DOCUMENT (si parte solo da TEXT e AI_GENERATED)
- Deduplicazione Livello 3 (verifica via LLM sui casi ambigui)
- Deduplicazione cross-utente / grafo condiviso pubblico
- Autenticazione multi-utente avanzata (per l'MVP anche un solo utente/demo va bene)
- Estrazione testo da PDF/documenti caricati

---

## 3. Stack tecnico

| Livello | Scelta | Note |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | frontend e API nello stesso progetto |
| Grafo | react-force-graph (o Sigma.js) | layout a forza, zoom/drag già pronti |
| Styling | Tailwind CSS | |
| Backend | Next.js API routes | niente server separato per l'MVP |
| Database | PostgreSQL + estensione pgvector | dati relazionali + embedding nello stesso DB |
| ORM | Prisma | schema type-safe, migrazioni gestite |
| Hosting DB | Supabase o Neon | free tier con pgvector incluso |
| AI — testo | Gemini API, modello Flash | free tier generoso, qualità cloud reale |
| AI — embedding | Gemini embeddings | per la dedup semantica |
| Deploy | Vercel | free tier, integrazione nativa con Next.js |
| Rate limiting | Upstash Ratelimit (Redis) | protezione degli endpoint AI pubblici |

---

## 4. Struttura del progetto (condensata)

```
knowledge-graph/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── nodes/
│   │   │   │   ├── route.ts              # GET lista, POST crea nodo
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET/PATCH/DELETE nodo
│   │   │   │       └── expand/route.ts   # POST: genera nodi figli
│   │   │   └── edges/route.ts
│   │   ├── graph/page.tsx                # vista grafo
│   │   └── node/[id]/page.tsx            # dettaglio/editing nodo
│   ├── components/
│   │   ├── graph/         # GraphView, NodeDetail, NodeEditor
│   │   └── ui/             # componenti generici
│   ├── lib/
│   │   ├── ai/             # generateNodes, generateExplanation, embeddings, prompts
│   │   ├── dedup/          # fuzzyMatch, semanticMatch
│   │   ├── db/prisma.ts
│   │   └── validation/     # schemi Zod per validare output AI
│   └── types/graph.ts
├── .env.local               # mai committato
└── .env.example              # committato, senza valori reali
```

**Ordine di sviluppo consigliato:** `schema.prisma` → API CRUD base senza AI → `lib/ai` (generazione nodi) → frontend `GraphView`. Così c'è sempre qualcosa di funzionante ad ogni step.

---

## 5. Modello dati

```prisma
model Node {
  id          String    @id @default(uuid())
  title       String
  summary     String?
  createdAt   DateTime  @default(now())
  embedding   Unsupported("vector(768)")?

  contents    Content[]
  edgesFrom   Edge[]    @relation("source")
  edgesTo     Edge[]    @relation("target")
}

model Content {
  id            String      @id @default(uuid())
  nodeId        String
  node          Node        @relation(fields: [nodeId], references: [id])
  type          ContentType
  text          String?
  url           String?
  fileUrl       String?
  aiGenerated   Boolean     @default(false)
  editedByUser  Boolean     @default(false)
  createdAt     DateTime    @default(now())

  generatedNodes Edge[]     @relation("generatedFrom")
}

enum ContentType {
  TEXT
  LINK
  DOCUMENT
  AI_GENERATED
}

model Edge {
  id                      String    @id @default(uuid())
  sourceNodeId            String
  targetNodeId            String
  source                  Node      @relation("source", fields: [sourceNodeId], references: [id])
  target                  Node      @relation("target", fields: [targetNodeId], references: [id])
  generatedFromContentId  String?
  generatedFromContent    Content?  @relation("generatedFrom", fields: [generatedFromContentId], references: [id])
  createdAt               DateTime  @default(now())
}
```

**Note:**
- `Content` è separato da `Node` perché un nodo accumula più contenuti nel tempo, di tipo diverso.
- `generatedFromContentId` su `Edge` mantiene la tracciabilità: si sa sempre quale contenuto specifico ha originato quale nodo figlio.
- I file caricati non vanno salvati nel database: solo l'URL verso uno storage esterno (es. Vercel Blob) in `fileUrl`.

---

## 6. Deduplicazione dei nodi

1. **Livello 1 — Fuzzy match sul nome** (baseline, MVP): confronto case-insensitive con soglia di similarità (es. Levenshtein) prima di creare un nodo nuovo.
2. **Livello 2 — Similarità semantica via embedding** (feature principale da mostrare): embedding di nome+descrizione, cosine similarity contro i nodi esistenti dell'utente via pgvector.
   - similarità alta (es. >0.92) → non crea nodo, collega a quello esistente
   - similarità media (es. 0.75–0.92) → chiede conferma all'utente
   - similarità bassa → crea nodo nuovo
3. **Livello 3 — Verifica via LLM** (opzionale/futuro): per i casi ambigui del Livello 2, un prompt mirato chiede all'LLM se due nodi rappresentano lo stesso concetto.

Scope: dedup solo all'interno del grafo dello stesso utente per l'MVP.

---

## 7. Flussi chiave

**Generazione nodi figli da contenuto:**
```
Utente scrive/conferma un testo su un nodo
  → generateNodesFromText(text, contestoNodo)
  → validazione output AI con Zod
  → dedup check (Livello 1 + 2)
  → proposta nodi + edge mostrata all'utente
  → utente conferma/modifica/scarta
  → salvataggio definitivo in DB
```

**"Approfondisci" (nota generata da AI):** due chiamate separate, non unite in una sola — permette revisione umana intermedia e riusa la stessa funzione di generazione nodi sia per testo scritto a mano sia per testo generato.
```
1. Click "Approfondisci"
   → generateExplanation(contestoNodo) → bozza testo
   → utente rivede/modifica → conferma
   → salvato come Content (type: AI_GENERATED)

2. Il contenuto confermato entra nel flusso di generazione nodi sopra
```

Il contesto passato ai prompt dovrebbe includere titolo del nodo, contenuti già presenti, ed eventualmente nodi vicini nel grafo (genitori/fratelli), per coerenza tematica con il ramo che l'utente sta esplorando.

---

## 8. Sicurezza — gestione chiave API

- Chiave Gemini solo in variabili d'ambiente (`.env.local` in locale, Environment Variables su Vercel in produzione) — mai nel codice, mai committata.
- Mai usare il prefisso `NEXT_PUBLIC_` sulla chiave: la renderebbe visibile nel bundle client.
- Le chiamate a Gemini avvengono solo dentro le API routes (server-side); il frontend chiama sempre e solo le proprie API routes, mai Gemini direttamente.
- `.env.example` committato (senza valori reali) per documentare le variabili richieste a chi clona il repo.
- Rate limiting sugli endpoint che chiamano l'AI, per evitare abusi su un repo/demo pubblici.
- Secret scanning attivo su GitHub. Se una chiave viene committata per errore: revocarla subito su Google AI Studio e ripulire la cronologia Git (un commit di rimozione successivo non basta).

---

## 9. Roadmap di sviluppo

**Fase 1 — Inizializzazione**
Setup Next.js + TypeScript + Tailwind; database (Supabase/Neon) con pgvector; schema Prisma iniziale + prima migrazione; `.env.example`; deploy "hello world" su Vercel per validare subito la pipeline.

**Fase 2 — Backend base (senza AI)**
API CRUD per Node ed Edge; creazione manuale di nodi e collegamenti; salvataggio Content di tipo TEXT.

**Fase 3 — Generazione AI**
Integrazione Gemini (chiamata server-side, parsing output); `generateNodesFromText` con prompt + validazione Zod; dedup Livello 1 e poi Livello 2.

**Fase 4 — Frontend / vista a grafo**
`GraphView` con react-force-graph; pannello dettaglio nodo + editor contenuto; UI di conferma/modifica/scarto dei nodi proposti.

**Fase 5 — Feature "Approfondisci"**
`generateExplanation` con editor di revisione; collegamento al flusso di generazione nodi già esistente.

**Fase 6 — Rifinitura**
Rate limiting sugli endpoint AI; gestione errori (chiamate fallite, output malformato); loading state durante la generazione; test end-to-end del flusso completo.

**Definizione di "completo" per il portfolio:**
- Flusso end-to-end funzionante: crea nodo → aggiungi testo o usa "Approfondisci" → genera figli → dedup → conferma → grafo aggiornato
- Demo online (Vercel) con dati di esempio già presenti
- README con: descrizione progetto, screenshot/GIF del grafo, stack, istruzioni di setup locale, decisioni architetturali principali (perché Gemini free tier, perché dedup a livelli, perché le chiamate AI sono separate)
- Repo pubblico pulito: `.env.example` presente, nessun secret nella history, commit incrementali leggibili

---

## 10. Estensioni future (fuori scope MVP)

- Contenuti di tipo LINK e DOCUMENT, con estrazione testo da PDF
- Deduplicazione Livello 3 via LLM per i casi ambigui
- Architettura AI model-agnostic (wrapper che astrae il provider, per supportare anche Ollama self-hosted)
- Grafo condiviso/pubblico tra utenti
- Vista "cosa manca" per domini con struttura a set (es. serie, edizioni)
