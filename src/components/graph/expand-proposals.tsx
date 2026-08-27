"use client";

import { faLink, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { ExpandProposal, ExpandResponse } from "@/types/graph";

type Draft = ExpandProposal & {
  kept: boolean;
  resolvedAction: "new" | "link";
};

function toDrafts(proposals: ExpandProposal[]): Draft[] {
  return proposals.map((proposal) => ({
    ...proposal,
    kept: true,
    resolvedAction: proposal.action === "link" ? "link" : "new",
  }));
}

type ExpandProposalsProps = {
  nodeId: string;
  result: ExpandResponse;
  onConfirmed: () => void;
  onDismiss: () => void;
};

export function ExpandProposals({
  nodeId,
  result,
  onConfirmed,
  onDismiss,
}: ExpandProposalsProps) {
  const [drafts, setDrafts] = useState(() => toDrafts(result.proposals));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kept = useMemo(
    () => drafts.filter((draft) => draft.kept && draft.title.trim()),
    [drafts],
  );

  function update(index: number, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    );
  }

  async function handleConfirm() {
    if (kept.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/expand/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentHash: result.contentHash,
          accepted: kept.map((draft) => ({
            action: draft.resolvedAction,
            title: draft.title.trim(),
            summary: draft.summary.trim() || null,
            relation: draft.relation,
            existingNodeId:
              draft.resolvedAction === "link" ? draft.existingNodeId : null,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to add related nodes");
        return;
      }
      onConfirmed();
    } catch {
      setError("Network error while adding related nodes");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Related topics
        </h3>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Review, edit, or discard proposals before they are added to the graph.
      </p>
      <ul className="space-y-3">
        {drafts.map((draft, index) => (
          <li key={`${draft.title}-${index}`}>
            <ProposalCard
              draft={draft}
              disabled={pending}
              onChange={(patch) => update(index, patch)}
            />
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        disabled={pending || kept.length === 0}
        onClick={() => void handleConfirm()}
        className="w-full"
      >
        {pending ? "Adding…" : `Add ${kept.length} to graph`}
      </Button>
    </div>
  );
}

function ProposalCard({
  draft,
  disabled,
  onChange,
}: {
  draft: Draft;
  disabled: boolean;
  onChange: (patch: Partial<Draft>) => void;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-background p-3 ${
        draft.kept ? "" : "opacity-50"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <ActionBadge draft={draft} />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ kept: !draft.kept })}
          className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={draft.kept ? "Discard proposal" : "Keep proposal"}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      <Input
        value={draft.title}
        disabled={disabled || !draft.kept}
        onChange={(event) => onChange({ title: event.target.value })}
        aria-label="Proposed title"
      />
      <p className="mt-2 text-xs text-muted-foreground">{draft.summary}</p>
      {draft.action === "ask" && draft.kept && (
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            variant={draft.resolvedAction === "new" ? "primary" : "secondary"}
            disabled={disabled}
            className="flex-1"
            onClick={() => onChange({ resolvedAction: "new" })}
          >
            <FontAwesomeIcon icon={faPlus} />
            Create new
          </Button>
          <Button
            type="button"
            variant={draft.resolvedAction === "link" ? "primary" : "secondary"}
            disabled={disabled || !draft.existingNodeId}
            className="flex-1"
            onClick={() => onChange({ resolvedAction: "link" })}
          >
            <FontAwesomeIcon icon={faLink} />
            Link existing
          </Button>
        </div>
      )}
      {draft.resolvedAction === "link" && draft.matchTitle && (
        <p className="mt-2 text-xs text-muted-foreground">
          Will link to “{draft.matchTitle}”
        </p>
      )}
    </div>
  );
}

function ActionBadge({ draft }: { draft: Draft }) {
  const label =
    draft.action === "link"
      ? "Already in graph"
      : draft.action === "ask"
        ? "Similar topic"
        : "New";
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {label}
      {draft.relation ? ` · ${draft.relation}` : ""}
    </span>
  );
}
