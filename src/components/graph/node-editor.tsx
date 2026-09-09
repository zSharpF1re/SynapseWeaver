"use client";

import {
  faArrowDown,
  faArrowLeft,
  faFileLines,
  faLink,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RichTextBody } from "@/components/editor/rich-text-viewer";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { ExportNodeButton } from "@/components/graph/export-node-button";
import { WriteWithAi } from "@/components/graph/write-with-ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  contentTypeAccent,
  contentTypeBadge,
  contentTypeIcons,
  contentTypeSurface,
  FontAwesomeIcon,
} from "@/components/ui/icon";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  coerceDoc,
  EMPTY_DOC,
  isEmptyDoc,
  stringifyDoc,
} from "@/lib/rich-text";
import type { ContentDto, NodeDetail, NodePlacement } from "@/types/graph";

type NodeEditorProps = {
  nodeId?: string;
  graphId?: string;
  sourceNodeId?: string;
  place?: boolean;
  placement?: NodePlacement | null;
};

export function NodeEditor({
  nodeId,
  graphId,
  sourceNodeId,
  place,
  placement,
}: NodeEditorProps) {
  if (!nodeId) {
    return (
      <CreateNodeEditor
        graphId={graphId}
        sourceNodeId={sourceNodeId}
        place={Boolean(place) && !sourceNodeId}
      />
    );
  }
  return <ExistingNodeEditor nodeId={nodeId} placement={placement ?? null} />;
}

function CreateNodeEditor({
  graphId: graphIdProp,
  sourceNodeId,
  place,
}: {
  graphId?: string;
  sourceNodeId?: string;
  place: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [graphId, setGraphId] = useState(graphIdProp ?? "");
  const [parentTitle, setParentTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      if (!sourceNodeId && !graphIdProp) {
        if (!cancelled) {
          setError("graphId or from is required");
          setLoading(false);
        }
        return;
      }

      if (!sourceNodeId) {
        if (!cancelled) {
          setGraphId(graphIdProp ?? "");
          setParentTitle(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/nodes/${sourceNodeId}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error ?? "Failed to load source node");
          setLoading(false);
          return;
        }
        const parent = body as NodeDetail;
        if (graphIdProp && graphIdProp !== parent.graphId) {
          setGraphId("");
          setError("Source node does not belong to this graph");
          setLoading(false);
          return;
        }
        setGraphId(parent.graphId);
        setParentTitle(parent.title);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Network error while loading source node");
          setLoading(false);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [graphIdProp, sourceNodeId]);

  async function createNode(event: FormEvent) {
    event.preventDefault();
    if (!graphId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graphId,
          title,
          summary: summary.trim() ? summary.trim() : null,
          ...(sourceNodeId ? { sourceNodeId } : {}),
          ...(place ? { place: true } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create node");
        return;
      }
      router.replace(
        nodeEditorHref(
          body.id as string,
          body.placement as NodePlacement | undefined,
        ),
      );
      router.refresh();
    } catch {
      setError("Network error while creating node");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const backHref = graphId ? `/graph/${graphId}` : "/graphs";

  if (error && !graphId) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-3 p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link
          href="/graphs"
          className="inline-flex items-center justify-center gap-2 text-sm text-accent hover:underline"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to graphs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Graph
        </Link>
      </div>

      {parentTitle && sourceNodeId && (
        <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <FontAwesomeIcon icon={faLink} className="mr-2" />
          Will be linked to{" "}
          <Link
            href={`/node/${sourceNodeId}`}
            className="font-medium text-foreground hover:underline"
          >
            {parentTitle}
          </Link>
        </p>
      )}

      {place && (
        <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          We&apos;ll hook it to the closest topic if there is one.
        </p>
      )}

      <Card>
        <form onSubmit={createNode} className="space-y-4">
          <div>
            <Label htmlFor="node-title">Title</Label>
            <Input
              id="node-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New topic"
              required
            />
          </div>
          <div>
            <Label htmlFor="node-summary">Summary</Label>
            <Textarea
              id="node-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Optional short description"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving || !title.trim() || !graphId}>
              {place ? (
                <FontAwesomeIcon icon={faArrowDown} />
              ) : null}
              {saving
                ? place
                  ? "Dropping in…"
                  : "Creating…"
                : place
                  ? "Drop in"
                  : "Create node"}
            </Button>
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}

function nodeEditorHref(id: string, placement?: NodePlacement): string {
  if (!placement) return `/node/${id}`;
  const params = new URLSearchParams({ placed: placement.status });
  if (placement.neighborTitle) params.set("neighbor", placement.neighborTitle);
  if (placement.neighborId) params.set("neighborId", placement.neighborId);
  return `/node/${id}?${params.toString()}`;
}

function PlacementBanner({ placement }: { placement: NodePlacement }) {
  if (placement.status === "linked" && placement.neighborTitle) {
    return (
      <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        <FontAwesomeIcon icon={faLink} className="mr-2" />
        Linked to{" "}
        {placement.neighborId ? (
          <Link
            href={`/node/${placement.neighborId}`}
            className="font-medium text-foreground hover:underline"
          >
            {placement.neighborTitle}
          </Link>
        ) : (
          <span className="font-medium text-foreground">
            {placement.neighborTitle}
          </span>
        )}
      </p>
    );
  }

  if (placement.status === "skipped") {
    return (
      <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        Couldn&apos;t place it automatically — left unconnected.
      </p>
    );
  }

  return (
    <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
      No close topic — left unconnected.
    </p>
  );
}

function ExistingNodeEditor({
  nodeId,
  placement,
}: {
  nodeId: string;
  placement: NodePlacement | null;
}) {
  const router = useRouter();
  const [hint] = useState(placement);
  const [node, setNode] = useState<NodeDetail | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to load node");
        setNode(null);
        return;
      }
      const detail = body as NodeDetail;
      setNode(detail);
      setTitle(detail.title);
      setSummary(detail.summary ?? "");
    } catch {
      setError("Network error while loading node");
      setNode(null);
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!placement) return;
    router.replace(`/node/${nodeId}`, { scroll: false });
  }, [nodeId, placement, router]);

  async function saveMeta(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary: summary.trim() ? summary.trim() : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to save");
        return;
      }
      setMessage("Saved");
      await load();
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNode() {
    if (!confirm("Delete this node and its contents?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to delete");
        return;
      }
      router.push(node ? `/graph/${node.graphId}` : "/graphs");
      router.refresh();
    } catch {
      setError("Network error while deleting");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading node…
      </div>
    );
  }

  if (!node) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-3 p-8 text-center">
        <p className="text-sm text-destructive">{error ?? "Node not found"}</p>
        <Link href="/graphs" className="inline-flex items-center gap-2 text-sm text-accent hover:underline">
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to graphs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/graph/${node.graphId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Graph
          </Link>
          <ExportNodeButton nodeId={node.id} />
        </div>
        <Button variant="danger" type="button" onClick={() => void deleteNode()}>
          <FontAwesomeIcon icon={faTrash} />
          Delete node
        </Button>
      </div>

      {hint && <PlacementBanner placement={hint} />}

      <Card>
        <form onSubmit={saveMeta} className="space-y-4">
          <div>
            <Label htmlFor="node-title">Title</Label>
            <Input
              id="node-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="node-summary">Summary</Label>
            <Textarea
              id="node-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Optional short description"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {message && (
              <span className="text-sm text-accent">{message}</span>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
      </Card>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Contents</h2>
        <WriteWithAi
          nodeId={nodeId}
          contents={node.contents}
          onCreated={() => void load()}
        />
        {node.contents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contents yet. Add text or a document below.
          </p>
        ) : (
          <ul className="space-y-3">
            {node.contents.map((content) => (
              <li key={content.id}>
                <ContentItem content={content} onChanged={() => void load()} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddContentForms nodeId={nodeId} onCreated={() => void load()} />
    </div>
  );
}

function isRichText(type: ContentDto["type"]) {
  return type === "TEXT" || type === "AI_GENERATED";
}

function ContentItem({
  content,
  onChanged,
}: {
  content: ContentDto;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(
    isRichText(content.type)
      ? (content.text ?? stringifyDoc(EMPTY_DOC))
      : (content.text ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      if (isRichText(content.type)) payload.text = text;
      if (content.type === "DOCUMENT") {
        payload.text = text.trim();
      }

      const res = await fetch(`/api/contents/${content.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to update");
        return;
      }
      setEditing(false);
      onChanged();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this content?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/contents/${content.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to delete");
        return;
      }
      onChanged();
    } catch {
      setError("Network error");
    }
  }

  const textEmpty = isRichText(content.type) && isEmptyDoc(coerceDoc(text));

  return (
    <Card className={contentTypeSurface[content.type]}>
      <div
        className={`mb-2 flex items-center gap-2 ${content.type === "TEXT" ? "justify-end" : "justify-between"}`}
      >
        {content.type !== "TEXT" && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${contentTypeBadge[content.type]}`}
          >
            <FontAwesomeIcon icon={contentTypeIcons[content.type]} />
            {content.type}
          </span>
        )}
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setText(
                isRichText(content.type)
                  ? (content.text ?? stringifyDoc(EMPTY_DOC))
                  : (content.text ?? ""),
              );
              setEditing((v) => !v);
            }}
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => void remove()}>
            Delete
          </Button>
        </div>
      </div>

      {!editing && (
        <div className="space-y-1 text-sm">
          {content.type === "TEXT" && <RichTextBody text={content.text} />}
          {content.type === "DOCUMENT" && (
            <>
              <a
                href={content.fileUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`break-all hover:underline ${contentTypeAccent.DOCUMENT}`}
              >
                {content.fileUrl}
              </a>
              {content.text && (
                <p className="text-muted-foreground">{content.text}</p>
              )}
            </>
          )}
          {content.type === "AI_GENERATED" && (
            <RichTextBody text={content.text} />
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-3">
          {isRichText(content.type) && (
            <RichTextEditor
              key={content.id}
              value={content.text}
              onChange={setText}
            />
          )}
          {content.type === "DOCUMENT" && (
            <div>
              <Label htmlFor={`edit-text-${content.id}`}>Caption (optional)</Label>
              <Textarea
                id={`edit-text-${content.id}`}
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="button"
            disabled={pending || textEmpty}
            onClick={() => void save()}
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}

      {error && !editing && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </Card>
  );
}

function AddContentForms({
  nodeId,
  onCreated,
}: {
  nodeId: string;
  onCreated: () => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Add content</h2>
      <div className="grid gap-4 md:grid-cols-1">
        <AddTextForm nodeId={nodeId} onCreated={onCreated} />
        <AddDocumentForm nodeId={nodeId} onCreated={onCreated} />
      </div>
    </section>
  );
}

function AddTextForm({
  nodeId,
  onCreated,
}: {
  nodeId: string;
  onCreated: () => void;
}) {
  const [text, setText] = useState(() => stringifyDoc(EMPTY_DOC));
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const empty = isEmptyDoc(coerceDoc(text));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/contents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TEXT", text }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to add text");
        return;
      }
      setText(stringifyDoc(EMPTY_DOC));
      setEditorKey((key) => key + 1);
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <RichTextEditor key={editorKey} value={text} onChange={setText} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || empty}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>
    </Card>
  );
}

function AddDocumentForm({
  nodeId,
  onCreated,
}: {
  nodeId: string;
  onCreated: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const uploadBody = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadBody.error ?? "Upload failed");
        return;
      }

      const res = await fetch(`/api/nodes/${nodeId}/contents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DOCUMENT",
          fileUrl: uploadBody.fileUrl,
          text: caption.trim() ? caption.trim() : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to add document");
        return;
      }
      setFile(null);
      setCaption("");
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="surface-file">
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-file-foreground">
        <FontAwesomeIcon icon={faFileLines} />
        Document
      </h3>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="add-doc-file">File</Label>
          <Input
            id="add-doc-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        <div>
          <Label htmlFor="add-doc-caption">Caption (optional)</Label>
          <Input
            id="add-doc-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || !file}>
          {pending ? "Uploading…" : "Add document"}
        </Button>
      </form>
    </Card>
  );
}
