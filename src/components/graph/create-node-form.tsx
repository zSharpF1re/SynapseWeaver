"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@/components/ui/icon";
import { Input, Label } from "@/components/ui/input";

export function CreateNodeForm({
  graphId,
  onCreated,
}: {
  graphId: string;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graphId,
          title,
          summary: summary.trim() ? summary.trim() : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create node");
        return;
      }
      setTitle("");
      setSummary("");
      onCreated?.();
      router.push(`/node/${body.id}`);
      router.refresh();
    } catch {
      setError("Network error while creating node");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="new-node-title">Title</Label>
        <Input
          id="new-node-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New topic"
          required
        />
      </div>
      <div>
        <Label htmlFor="new-node-summary">Summary (optional)</Label>
        <Input
          id="new-node-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Short description"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending || !title.trim()}>
        <FontAwesomeIcon icon={faPlus} />
        {pending ? "Creating…" : "Create node"}
      </Button>
    </form>
  );
}
