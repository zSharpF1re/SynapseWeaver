"use client";

import { faPen, faPlus, faWandMagicSparkles, faXmark } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExpandProposals } from "@/components/graph/expand-proposals";
import { ExportNodeButton } from "@/components/graph/export-node-button";
import { RichTextBody } from "@/components/editor/rich-text-viewer";
import { Button } from "@/components/ui/button";
import {
  contentTypeAccent,
  contentTypeBadge,
  contentTypeIcons,
  contentTypeSurface,
  FontAwesomeIcon,
} from "@/components/ui/icon";
import type { ContentDto, ExpandResponse, NodeDetail } from "@/types/graph";

type NodeSidebarProps = {
  nodeId: string;
  onClose: () => void;
  onGraphChanged?: () => void;
};

export function NodeSidebar({
  nodeId,
  onClose,
  onGraphChanged,
}: NodeSidebarProps) {
  const [node, setNode] = useState<NodeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [expanding, setExpanding] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [expandResult, setExpandResult] = useState<ExpandResponse | null>(null);

  const loading = !error && node?.id !== nodeId;

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/nodes/${nodeId}`)
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error ?? "Failed to load node");
          setNode(null);
          return;
        }
        setError(null);
        setNode(body as NodeDetail);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Network error while loading node");
        setNode(null);
      });
    return () => {
      cancelled = true;
    };
  }, [nodeId, reloadToken]);

  function retryLoad() {
    setNode(null);
    setError(null);
    setReloadToken((token) => token + 1);
  }

  async function handleExpand() {
    setExpanding(true);
    setExpandError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/expand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) {
        setExpandError(body.error ?? "Failed to expand node");
        setExpandResult(null);
        return;
      }
      setExpandResult(body as ExpandResponse);
    } catch {
      setExpandError("Network error while expanding node");
      setExpandResult(null);
    } finally {
      setExpanding(false);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar"
        className="absolute inset-0 z-20 bg-foreground/10"
        onClick={onClose}
      />
      <aside
        className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[1000px] flex-col border-l border-border bg-card shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-sidebar-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : node ? (
              <>
                <h2
                  id="node-sidebar-title"
                  className="truncate text-base font-semibold text-foreground"
                >
                  {node.title}
                </h2>
                {node.summary && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {node.summary}
                  </p>
                )}
              </>
            ) : (
              <h2
                id="node-sidebar-title"
                className="text-base font-semibold text-foreground"
              >
                Node
              </h2>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {node && !error && (
              <>
                <Link
                  href={`/node/new?from=${node.id}&graphId=${node.graphId}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Add connected node"
                  title="Add connected node"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </Link>
                <ExportNodeButton nodeId={node.id} variant="ghost" />
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="secondary" onClick={retryLoad}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && node && (
            <div className="space-y-4">
              {expandError && (
                <p className="text-sm text-destructive">{expandError}</p>
              )}
              {expanding && (
                <p className="text-sm text-muted-foreground">
                  Finding related topics…
                </p>
              )}
              {expandResult && (
                <ExpandProposals
                  key={expandResult.contentHash}
                  nodeId={node.id}
                  result={expandResult}
                  onDismiss={() => setExpandResult(null)}
                  onConfirmed={() => {
                    setExpandResult(null);
                    onGraphChanged?.();
                  }}
                />
              )}
              {node.contents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contents yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {node.contents.map((content) => (
                    <li key={content.id}>
                      <ContentPreview content={content} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {node && !error && (
          <div className="flex gap-2 border-t border-border px-4 py-3">
            <Link
              href={`/node/${node.id}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <FontAwesomeIcon icon={faPen} />
              Edit
            </Link>
            <Button
              type="button"
              className="flex-1"
              variant="secondary"
              disabled={expanding || loading}
              onClick={() => void handleExpand()}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} />
              {expanding ? "Expand…" : "Expand"}
            </Button>
            
          </div>
        )}
      </aside>
    </>
  );
}

function ContentPreview({ content }: { content: ContentDto }) {
  return (
    <div
      className={`rounded-xl border border-border bg-background p-3 ${contentTypeSurface[content.type]}`}
    >
      {content.type !== "TEXT" && (
        <span
          className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${contentTypeBadge[content.type]}`}
        >
          <FontAwesomeIcon icon={contentTypeIcons[content.type]} />
          {content.type}
        </span>
      )}
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
    </div>
  );
}
