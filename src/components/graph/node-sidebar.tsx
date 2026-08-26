"use client";

import { faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { contentTypeIcons, FontAwesomeIcon } from "@/components/ui/icon";
import type { ContentDto, NodeDetail } from "@/types/graph";

type NodeSidebarProps = {
  nodeId: string;
  onClose: () => void;
};

export function NodeSidebar({ nodeId, onClose }: NodeSidebarProps) {
  const [node, setNode] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setNode(body as NodeDetail);
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
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="secondary" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && node && (
            <div className="space-y-4">
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
          <div className="border-t border-border px-4 py-3 flex justify-center">
            <Link
              href={`/node/${node.id}`}
              className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              <FontAwesomeIcon icon={faPen} />
              Modifica
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function ContentPreview({ content }: { content: ContentDto }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <FontAwesomeIcon icon={contentTypeIcons[content.type]} />
        {content.type}
      </span>
      <div className="space-y-1 text-sm">
        {content.type === "TEXT" && (
          <p className="whitespace-pre-wrap text-foreground">{content.text}</p>
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
    </div>
  );
}
