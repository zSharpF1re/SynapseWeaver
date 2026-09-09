import Link from "next/link";
import { faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@/components/ui/icon";
import Image from "next/image";

export function AppHeader() {
  return (
    <header className="flex h-[5dvh] shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <Link
          href="/graphs"
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <Image src="/favicon.ico"  className="rounded-sm" alt="SynapseWeaver" width={16} height={16} />
          SynapseWeaver
        </Link>
        <nav className="hidden text-sm text-muted-foreground sm:block">
          <Link href="/graphs" className="hover:text-foreground">
            Graphs
          </Link>
        </nav>
      </div>
    </header>
  );
}
