"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@/components/ui/icon";

export type ContextMenuItem =
  | { type: "separator"; id?: string }
  | {
      type: "item";
      id: string;
      label: string;
      icon?: IconDefinition;
      variant?: "default" | "danger";
      disabled?: boolean;
      onSelect: () => void;
    };

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  ariaLabel?: string;
};

const VIEWPORT_PAD = 8;

export function ContextMenu({
  x,
  y,
  items,
  onClose,
  ariaLabel = "Actions",
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemIdPrefix = useId();
  const [coords, setCoords] = useState({ left: x, top: y });
  const enabledIndexes = useMemo(
    () =>
      items
        .map((item, index) =>
          item.type === "item" && !item.disabled ? index : -1,
        )
        .filter((index) => index >= 0),
    [items],
  );
  const [activeIndex, setActiveIndex] = useState(enabledIndexes[0] ?? -1);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const maxLeft = window.innerWidth - width - VIEWPORT_PAD;
    const maxTop = window.innerHeight - height - VIEWPORT_PAD;
    setCoords({
      left: Math.max(VIEWPORT_PAD, Math.min(x, maxLeft)),
      top: Math.max(VIEWPORT_PAD, Math.min(y, maxTop)),
    });
  }, [x, y, items]);

  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (enabledIndexes.length === 0) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => {
          const pos = enabledIndexes.indexOf(current);
          const start = pos === -1 ? 0 : pos;
          const delta = event.key === "ArrowDown" ? 1 : -1;
          const next =
            (start + delta + enabledIndexes.length) % enabledIndexes.length;
          return enabledIndexes[next]!;
        });
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const item = items[activeIndex];
        if (item?.type === "item" && !item.disabled) {
          item.onSelect();
          onClose();
        }
      }
    }
    function onViewportChange() {
      onClose();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [activeIndex, enabledIndexes, items, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      aria-label={ariaLabel}
      className="fixed z-50 min-w-48 rounded-xl border border-border bg-card p-1 shadow-lg outline-none"
      style={{ left: coords.left, top: coords.top }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) => {
        if (item.type === "separator") {
          return (
            <div
              key={item.id ?? `${itemIdPrefix}-sep-${index}`}
              role="separator"
              className="my-1 h-px bg-border"
            />
          );
        }

        const active = index === activeIndex;
        const danger = item.variant === "danger";
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              danger
                ? "text-destructive hover:bg-destructive/10"
                : "text-foreground hover:bg-muted"
            } ${active ? (danger ? "bg-destructive/10" : "bg-muted") : ""}`}
            onMouseEnter={() => {
              if (!item.disabled) setActiveIndex(index);
            }}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect();
              onClose();
            }}
          >
            {item.icon && (
              <FontAwesomeIcon icon={item.icon} className="w-4 shrink-0" />
            )}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
