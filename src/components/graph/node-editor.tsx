"use client";

import {
  faAlignLeft,
  faArrowLeft,
  faFileLines,
  faLink,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { contentTypeIcons, FontAwesomeIcon } from "@/components/ui/icon";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { ContentDto, NodeDetail } from "@/types/graph";

export function NodeEditor({ nodeId }: { nodeId: string }) {
  const router = useRouter();
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
      router.push("/graph");
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
        <Link href="/graph" className="inline-flex items-center gap-2 text-sm text-accent hover:underline">
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to graph
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/graph"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Graph
        </Link>
        <Button variant="danger" type="button" onClick={() => void deleteNode()}>
          <FontAwesomeIcon icon={faTrash} />
          Delete node
        </Button>
      </div>

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
        {node.contents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contents yet. Add text, a link, or a document below.
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

function ContentItem({
  content,
  onChanged,
}: {
  content: ContentDto;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content.text ?? "");
  const [url, setUrl] = useState(content.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      if (content.type === "TEXT") payload.text = text;
      if (content.type === "LINK") {
        payload.url = url;
        if (text.trim()) payload.text = text;
      }
      if (content.type === "DOCUMENT" && text.trim()) {
        payload.text = text;
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

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <FontAwesomeIcon icon={contentTypeIcons[content.type]} />
          {content.type}
        </span>
        <div className="flex gap-1">
          {content.type !== "AI_GENERATED" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Cancel" : "Edit"}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => void remove()}>
            Delete
          </Button>
        </div>
      </div>

      {!editing && (
        <div className="space-y-1 text-sm">
          {content.type === "TEXT" && (
            <p className="whitespace-pre-wrap">{content.text}</p>
          )}
          {content.type === "LINK" && (
            <>
              <a
                href={content.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-accent hover:underline"
              >
                {content.url}
              </a>
              {content.text && (
                <p className="text-muted-foreground">{content.text}</p>
              )}
            </>
          )}
          {content.type === "DOCUMENT" && (
            <>
              <a
                href={content.fileUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-accent hover:underline"
              >
                {content.fileUrl}
              </a>
              {content.text && (
                <p className="text-muted-foreground">{content.text}</p>
              )}
            </>
          )}
          {content.type === "AI_GENERATED" && (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {content.text ?? "(empty)"}
            </p>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-3">
          {(content.type === "TEXT" ||
            content.type === "LINK" ||
            content.type === "DOCUMENT") && (
            <div>
              <Label htmlFor={`edit-text-${content.id}`}>
                {content.type === "TEXT" ? "Text" : "Caption (optional)"}
              </Label>
              <Textarea
                id={`edit-text-${content.id}`}
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                required={content.type === "TEXT"}
              />
            </div>
          )}
          {content.type === "LINK" && (
            <div>
              <Label htmlFor={`edit-url-${content.id}`}>URL</Label>
              <Input
                id={`edit-url-${content.id}`}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={pending} onClick={() => void save()}>
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
        <AddLinkForm nodeId={nodeId} onCreated={onCreated} />
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
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      setText("");
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
        <FontAwesomeIcon icon={faAlignLeft} className="text-muted-foreground" />
        Text
      </h3>
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Notes, explanations, quotes…"
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || !text.trim()}>
          {pending ? "Adding…" : "Add text"}
        </Button>
      </form>
    </Card>
  );
}

function AddLinkForm({
  nodeId,
  onCreated,
}: {
  nodeId: string;
  onCreated: () => void;
}) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/contents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LINK",
          url,
          text: caption.trim() ? caption.trim() : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to add link");
        return;
      }
      setUrl("");
      setCaption("");
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
        <FontAwesomeIcon icon={faLink} className="text-muted-foreground" />
        Link
      </h3>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="add-link-url">URL</Label>
          <Input
            id="add-link-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            required
          />
        </div>
        <div>
          <Label htmlFor="add-link-caption">Caption (optional)</Label>
          <Input
            id="add-link-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || !url.trim()}>
          {pending ? "Adding…" : "Add link"}
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
    <Card>
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
        <FontAwesomeIcon icon={faFileLines} className="text-muted-foreground" />
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
