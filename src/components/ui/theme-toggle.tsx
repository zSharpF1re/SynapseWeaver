"use client";

import { faDesktop, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@/components/ui/icon";

const modes = [
  { value: "light", label: "Light", icon: faSun },
  { value: "dark", label: "Dark", icon: faMoon },
  { value: "system", label: "System", icon: faDesktop },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-28 rounded-lg border border-border bg-muted/50" />
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex rounded-lg border border-border bg-card p-0.5"
    >
      {modes.map((mode) => {
        const active = theme === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            title={mode.label}
            aria-label={mode.label}
            onClick={() => setTheme(mode.value)}
            className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FontAwesomeIcon icon={mode.icon} />
          </button>
        );
      })}
    </div>
  );
}
