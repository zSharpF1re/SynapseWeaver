"use client";

import { faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@/components/ui/icon";

type ExportNodeButtonProps = {
  nodeId: string;
  variant?: "secondary" | "ghost";
};

export function ExportNodeButton({
  nodeId,
  variant = "secondary",
}: ExportNodeButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/export`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Failed to export node");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFromDisposition(res.headers.get("Content-Disposition"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error while exporting");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={() => void handleExport()}
      >
        <FontAwesomeIcon icon={faFilePdf} />
        {pending ? "Exporting…" : "Export"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function filenameFromDisposition(header: string | null): string {
  if (!header) return "node.pdf";
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1] ?? "node.pdf";
}
