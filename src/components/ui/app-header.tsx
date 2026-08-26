import Link from "next/link";
import { faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@/components/ui/icon";

export function AppHeader() {
  return (
    <header className="flex h-[5dvh] shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <Link
          href="/graph"
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <FontAwesomeIcon icon={faShareNodes} className="text-accent" />
          SynapseWeaver
        </Link>
        <nav className="hidden text-sm text-muted-foreground sm:block">
          <Link href="/graph" className="hover:text-foreground">
            Graph
          </Link>
        </nav>
      </div>
    </header>
  );
}
