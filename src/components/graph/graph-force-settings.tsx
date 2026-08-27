"use client";

import { faGear, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useId, useRef, useState } from "react";
import { FontAwesomeIcon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DEFAULT_GRAPH_FORCES,
  type GraphForceSettings,
  saveGraphForces,
} from "@/lib/graph-forces";

type GraphForceSettingsPanelProps = {
  value: GraphForceSettings;
  onChange: (next: GraphForceSettings) => void;
};

export function GraphForceSettingsPanel({
  value,
  onChange,
}: GraphForceSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveGraphForces(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    

    document.addEventListener("mousedown", handlePointerDown, true);
    return () => document.removeEventListener("mousedown", handlePointerDown, true);
  }, [open]);

  function update<K extends keyof GraphForceSettings>(
    key: K,
    next: GraphForceSettings[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2"
    >
      {open && (
        <div
          id={panelId}
          className="w-72 rounded-xl border border-border bg-card p-4 shadow-lg"
          role="region"
          aria-label="Graph layout settings"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Layout</h3>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ ...DEFAULT_GRAPH_FORCES })}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              Reset
            </button>
          </div>

          <div className="space-y-4">
            <SliderField
              label="Repulsione"
              min={30}
              max={800}
              step={10}
              value={value.repulsion}
              onChange={(v) => update("repulsion", v)}
            />
            <SliderField
              label="Distanza minima"
              min={4}
              max={80}
              step={1}
              value={value.minDistance}
              onChange={(v) => update("minDistance", v)}
            />
            <SliderField
              label="Distanza link"
              min={20}
              max={300}
              step={5}
              value={value.linkDistance}
              onChange={(v) => update("linkDistance", v)}
            />
            <SliderField
              label="Attrazione"
              min={0.05}
              max={1}
              step={0.05}
              value={value.attraction}
              onChange={(v) => update("attraction", Number(v.toFixed(2)))}
            />
            <ThemeToggle />
          </div>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Graph layout settings"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-muted"
      >
        <FontAwesomeIcon icon={faGear} className="text-lg" />
      </button>
    </div>
  );
}

function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <span className="font-mono text-xs text-foreground">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </div>
  );
}

