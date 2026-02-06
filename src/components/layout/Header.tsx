"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

function LiveBadge() {
  return (
    <Badge
      variant="destructive"
      className="animate-pulse gap-1.5 text-xs"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-white" />
      </span>
      LIVE
    </Badge>
  );
}

export function Header() {
  const pathname = usePathname();

  const showLiveBadge =
    pathname.includes("/staff") || pathname.includes("/results");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight"
        >
          EnduroRaceManager
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {showLiveBadge && <LiveBadge />}
        </div>
      </div>
    </header>
  );
}
