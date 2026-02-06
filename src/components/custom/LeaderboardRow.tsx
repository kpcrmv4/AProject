"use client";

import * as React from "react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Types (composition: status as discriminated union, not booleans) ---

type RacerStatus = "racing" | "finished" | "dnf";

interface LeaderboardRowProps {
  /** Current rank position */
  rank: number;
  /** Previous rank position (for animation direction) */
  previousRank: number;
  /** Racer bib number */
  racerNumber: string;
  /** Racer display name */
  racerName: string;
  /** Formatted time string (e.g., "01:23:45") */
  time: string;
  /** Gap to leader (e.g., "+0:12") */
  gap: string;
  /** Current racer status */
  status: RacerStatus;
  /** Whether this row was recently updated (triggers highlight) */
  isUpdated: boolean;
  /** Optional className */
  className?: string;
}

// --- Derived helpers (pure, no effects) ---

interface RankChangeInfo {
  readonly direction: "up" | "down" | "none";
  readonly delta: number;
  readonly ariaDescription: string;
}

function deriveRankChange(rank: number, previousRank: number): RankChangeInfo {
  if (previousRank === rank) {
    return { direction: "none", delta: 0, ariaDescription: "อันดับคงที่" };
  }
  if (rank < previousRank) {
    return {
      direction: "up",
      delta: previousRank - rank,
      ariaDescription: `ขึ้นมา ${previousRank - rank} อันดับ`,
    };
  }
  return {
    direction: "down",
    delta: rank - previousRank,
    ariaDescription: `ลงไป ${rank - previousRank} อันดับ`,
  };
}

function deriveStatusConfig(status: RacerStatus): {
  badge: React.ReactNode;
  rowClass: string;
  timeClass: string;
  nameClass: string;
} {
  switch (status) {
    case "dnf":
      return {
        badge: (
          <Badge variant="destructive" className="text-xs font-bold">
            DNF
          </Badge>
        ),
        rowClass: "opacity-60",
        timeClass: "line-through text-muted-foreground",
        nameClass: "line-through text-muted-foreground",
      };
    case "finished":
      return {
        badge: (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-400"
          >
            จบ
          </Badge>
        ),
        rowClass: "",
        timeClass: "text-emerald-700 dark:text-emerald-400",
        nameClass: "",
      };
    case "racing":
      return {
        badge: null,
        rowClass: "",
        timeClass: "",
        nameClass: "",
      };
  }
}

function deriveRankChangeIndicator(info: RankChangeInfo): React.ReactNode {
  switch (info.direction) {
    case "up":
      return (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400" aria-hidden="true">
          {"\u25B2"}{info.delta}
        </span>
      );
    case "down":
      return (
        <span className="text-xs font-bold text-red-600 dark:text-red-400" aria-hidden="true">
          {"\u25BC"}{info.delta}
        </span>
      );
    case "none":
      return null;
  }
}

// --- Component ---

function LeaderboardRow({
  rank,
  previousRank,
  racerNumber,
  racerName,
  time,
  gap,
  status,
  isUpdated,
  className,
}: LeaderboardRowProps): React.JSX.Element {
  // useRef for transient tracking (Rule 18.5)
  const prevRankRef = useRef<number>(previousRank);
  const hasAnimatedRef = useRef<boolean>(false);

  // Derived state during render (no useEffect for derived data)
  const rankChange: RankChangeInfo = deriveRankChange(rank, previousRank);
  const statusConfig = deriveStatusConfig(status);
  const rankIndicator = deriveRankChangeIndicator(rankChange);

  // Determine slide direction based on rank change for CSS animation
  const slideDirection: "up" | "down" | "none" =
    prevRankRef.current !== rank ? rankChange.direction : "none";

  // Update ref after deriving (transient, not reactive)
  if (prevRankRef.current !== rank) {
    prevRankRef.current = rank;
    hasAnimatedRef.current = true;
  }

  const monoStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all duration-300",
        statusConfig.rowClass,
        // Slide animation on rank change
        slideDirection === "up" &&
          "animate-[leaderboard-slide-up_0.3s_ease-out]",
        slideDirection === "down" &&
          "animate-[leaderboard-slide-down_0.3s_ease-out]",
        // Yellow flash on update
        isUpdated &&
          "animate-[leaderboard-flash_0.5s_ease-out] border-yellow-400/50",
        className,
      )}
      role="row"
      aria-label={`อันดับ ${rank} หมายเลข ${racerNumber} ${racerName} เวลา ${time} ${rankChange.ariaDescription}`}
    >
      {/* Rank */}
      <div className="flex w-12 flex-col items-center gap-0.5">
        <span
          className="text-2xl font-bold tabular-nums text-foreground"
          style={monoStyle}
        >
          {rank}
        </span>
        {rankIndicator !== null ? rankIndicator : null}
      </div>

      {/* Racer number */}
      <Badge
        variant="secondary"
        className="min-w-[48px] justify-center text-base font-bold tabular-nums"
        style={monoStyle}
      >
        {racerNumber}
      </Badge>

      {/* Racer name */}
      <span
        className={cn(
          "flex-1 truncate text-sm font-medium text-foreground",
          statusConfig.nameClass,
        )}
      >
        {racerName}
      </span>

      {/* Status badge (explicit ternary) */}
      {statusConfig.badge !== null ? statusConfig.badge : null}

      {/* Time */}
      <span
        className={cn(
          "min-w-[80px] text-right text-sm font-semibold tabular-nums",
          statusConfig.timeClass,
        )}
        style={monoStyle}
      >
        {time}
      </span>

      {/* Gap */}
      <span
        className="min-w-[64px] text-right text-xs tabular-nums text-muted-foreground"
        style={monoStyle}
      >
        {gap}
      </span>

      {/* Inline keyframes */}
      <style jsx={false}>{`
        @keyframes leaderboard-slide-up {
          0% { opacity: 0.7; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes leaderboard-slide-down {
          0% { opacity: 0.7; transform: translateY(-12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes leaderboard-flash {
          0% { background-color: oklch(0.88 0.15 85); }
          100% { background-color: transparent; }
        }
      `}</style>
    </div>
  );
}

export { LeaderboardRow };
export type { LeaderboardRowProps, RacerStatus };
