"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Types (composition: status as union, size as union) ---

type ConnectionStatus = "live" | "syncing" | "offline" | "error";
type BadgeSize = "sm" | "md" | "lg";

interface LiveBadgeProps {
  /** Current connection status */
  status: ConnectionStatus;
  /** Visual size of the badge */
  size?: BadgeSize;
  /** Whether to show the text label alongside the dot */
  showLabel?: boolean;
  /** Optional className for the root element */
  className?: string;
}

// --- Derived config (pure functions, no effects) ---

interface StatusConfig {
  readonly label: string;
  readonly dotClass: string;
  readonly badgeClass: string;
  readonly ariaLabel: string;
}

const STATUS_MAP: Record<ConnectionStatus, StatusConfig> = {
  live: {
    label: "ออนไลน์",
    dotClass: "bg-emerald-500 animate-[live-pulse_1.5s_ease-in-out_infinite]",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    ariaLabel: "สถานะ: เชื่อมต่อแล้ว",
  },
  syncing: {
    label: "กำลังซิงค์",
    dotClass: "bg-amber-500 animate-spin",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    ariaLabel: "สถานะ: กำลังซิงค์ข้อมูล",
  },
  offline: {
    label: "ออฟไลน์",
    dotClass: "bg-red-500",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    ariaLabel: "สถานะ: ออฟไลน์",
  },
  error: {
    label: "ข้อผิดพลาด",
    dotClass: "bg-red-600",
    badgeClass: "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400",
    ariaLabel: "สถานะ: เกิดข้อผิดพลาด",
  },
};

const SIZE_MAP: Record<BadgeSize, { dot: string; text: string; padding: string }> = {
  sm: { dot: "size-2", text: "text-xs", padding: "px-2 py-0.5" },
  md: { dot: "size-2.5", text: "text-sm", padding: "px-3 py-1" },
  lg: { dot: "size-3", text: "text-base", padding: "px-4 py-1.5" },
};

// --- Component ---

function LiveBadge({
  status,
  size = "md",
  showLabel = true,
  className,
}: LiveBadgeProps): React.JSX.Element {
  // Derived state during render (Rule 18.5: no useEffect)
  const config: StatusConfig = STATUS_MAP[status];
  const sizeConfig = SIZE_MAP[size];

  return (
    <Badge
      variant="outline"
      role="status"
      aria-live="polite"
      aria-label={config.ariaLabel}
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-medium transition-colors duration-200",
        config.badgeClass,
        sizeConfig.padding,
        sizeConfig.text,
        className,
      )}
    >
      {/* Status dot */}
      <span
        className={cn(
          "inline-block shrink-0 rounded-full",
          sizeConfig.dot,
          config.dotClass,
          // For syncing: make the dot a spinner ring instead of solid spin
          status === "syncing" && "rounded-full border-2 border-amber-500 border-t-transparent bg-transparent",
        )}
        aria-hidden="true"
      />

      {/* Label (explicit conditional, not &&) */}
      {showLabel ? (
        <span className="leading-none">{config.label}</span>
      ) : null}

      {/* Inline pulse keyframe */}
      <style jsx={false}>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
    </Badge>
  );
}

export { LiveBadge };
export type { LiveBadgeProps, ConnectionStatus, BadgeSize };
