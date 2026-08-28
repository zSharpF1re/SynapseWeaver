"use client";

import {
  faDownload,
  faFileImport,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FontAwesomeIcon } from "@/components/ui/icon";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { GraphListItem } from "@/types/graph";

const IMPORT_DISCLAIMER =
  "Import graphs only and only from trusted sources. No responsibility is taken for imported data or any harm that follows.";

export function GraphsPageClient() {
  const router = useRouter();
  const [graphs, setGraphs] = useState<GraphListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/graphs");
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to load graphs");
        setGraphs(null);
        return;
      }
      setGraphs(body as GraphListItem[]);
    } catch {
      setError("Network error while loading graphs");
      setGraphs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/graphs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          notes: notes.trim() ? notes.trim() : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create graph");
        return;
      }
      router.push(`/graph/${body.id}`);
    } catch {
      setError("Network error while creating graph");
    } finally {
      setCreating(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportError(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/graphs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const body = await res.json();
      if (!res.ok) {
        setImportError(body.error ?? "Failed to import graph");
        return;
      }
      router.push(`/graph/${body.id}`);
    } catch {
      setImportError("Network error while importing graph");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(graph: GraphListItem) {
    if (
      !confirm(
        `Delete “${graph.name}” and all of its nodes? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/graphs/${graph.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to delete graph");
        return;
      }
      await load();
    } catch {
      setError("Network error while deleting graph");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-xl font-semibold">Graphs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each graph is a separate map of topics. Open one to explore, or
          import a JSON export.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Create graph</h2>
          <form onSubmit={(event) => void handleCreate(event)} className="space-y-3">
            <div>
              <Label htmlFor="graph-name">Name</Label>
              <Input
                id="graph-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New graph"
                required
              />
            </div>
            <div>
              <Label htmlFor="graph-notes">Notes (optional)</Label>
              <Textarea
                id="graph-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What this graph is for"
                rows={3}
              />
            </div>
            <Button type="submit" disabled={creating || !name.trim()}>
              <FontAwesomeIcon icon={faPlus} />
              {creating ? "Creating…" : "Create graph"}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Import graph</h2>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {IMPORT_DISCLAIMER}
          </p>
          <input
            type="file"
            accept="application/json,.json"
            disabled={importing}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleImport(file);
            }}
          />
          {importing && (
            <p className="mt-2 text-sm text-muted-foreground">Importing…</p>
          )}
          {importError && (
            <p className="mt-2 text-sm text-destructive">{importError}</p>
          )}
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <FontAwesomeIcon icon={faFileImport} />
            JSON files only
          </p>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && (
        <p className="text-sm text-muted-foreground">Loading graphs…</p>
      )}

      {!loading && graphs && graphs.length === 0 && (
        <p className="text-sm text-muted-foreground">No graphs yet.</p>
      )}

      {!loading && graphs && graphs.length > 0 && (
        <ul className="space-y-3">
          {graphs.map((graph) => (
            <li key={graph.id}>
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">
                      {graph.name}
                    </h2>
                    {graph.notes && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {graph.notes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {graph.nodeCount} {graph.nodeCount === 1 ? "node" : "nodes"}{" "}
                      · Updated {new Date(graph.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/graph/${graph.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                    >
                      Open
                    </Link>
                    <a
                      href={`/api/graphs/${graph.id}/export`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      Export
                    </a>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => void handleDelete(graph)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
