"use client";

import { faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FontAwesomeIcon } from "@/components/ui/icon";
import { isSparseTextContents } from "@/lib/ai/sparse";
import { coerceDoc, isEmptyDoc } from "@/lib/rich-text";
import type { ContentDto, ExplainResponse } from "@/types/graph";

export function WriteWithAi({
  nodeId,
  contents,
  onCreated,
}: {
  nodeId: string;
  contents: ContentDto[];
  onCreated: () => void;
}) {
  const sparse = isSparseTextContents(contents);
  const [draft, setDraft] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empty = draft !== null && isEmptyDoc(coerceDoc(draft));

  if (!sparse && !draft && !generating && !error) return null;

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/explain`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to generate note");
        return;
      }
      const result = body as ExplainResponse;
      setDraft(result.text);
      setEditorKey((key) => key + 1);
    } catch {
      setError("Network error while generating note");
    } finally {
      setGenerating(false);
    }
  }

  async function keep() {
    if (!draft) return;
    setKeeping(true);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/contents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "AI_GENERATED", text: draft }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to save note");
        return;
      }
      setDraft(null);
      onCreated();
    } catch {
      setError("Network error while saving note");
    } finally {
      setKeeping(false);
    }
  }

  function discard() {
    setDraft(null);
    setError(null);
  }

  return (
    <div className="space-y-3">
      {sparse && !draft && (
        <Button
          type="button"
          variant="secondary"
          disabled={generating}
          onClick={() => void generate()}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} />
          {generating ? "Writing…" : "Write with AI"}
        </Button>
      )}
      {generating && (
        <p className="text-sm text-muted-foreground">Writing a study note…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {draft && !generating && (
        <Card>
          <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium">
            <FontAwesomeIcon icon={faWandMagicSparkles} />
            AI draft
          </p>
          <RichTextEditor key={editorKey} value={draft} onChange={setDraft} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={keeping || empty}
              onClick={() => void keep()}
            >
              {keeping ? "Saving…" : "Keep"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={keeping}
              onClick={() => void generate()}
            >
              Write again
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={keeping}
              onClick={discard}
            >
              Discard
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
