"use client";

import * as React from "react";
import { useRef, useState, useCallback, useEffect } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Types (composition pattern) ---

type EntryStatus = "success" | "warning";

interface HistoryEntry {
  /** Unique identifier for the entry */
  id: string;
  /** Racer/bib number */
  number: string;
  /** Status of the recording */
  status: EntryStatus;
  /** Timestamp of the recording (ISO string or epoch ms) */
  timestamp: number;
}

interface HistoryStripProps {
  /** Array of recent entries (newest first) */
  entries: readonly HistoryEntry[];
  /** Called when user clicks undo on an entry */
  onUndo: (entryId: string) => void;
  /** Maximum items to display (default 5) */
  maxItems?: number;
  /** Optional className for root container */
  className?: string;
}

// --- Undo countdown (5-second window) ---

const UNDO_WINDOW_MS = 5000;
const COUNTDOWN_INTERVAL_MS = 100;

function useUndoCountdown(
  entryId: string | null,
  onExpire: () => void,
): number {
  const [remainingMs, setRemainingMs] = useState<number>(UNDO_WINDOW_MS);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (entryId === null) {
      setRemainingMs(UNDO_WINDOW_MS);
      return;
    }

    startTimeRef.current = Date.now();
    setRemainingMs(UNDO_WINDOW_MS);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, UNDO_WINDOW_MS - elapsed);
      setRemainingMs(remaining);

      if (remaining <= 0) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onExpireRef.current();
      }
    }, COUNTDOWN_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [entryId]);

  return remainingMs;
}

// --- Single entry row ---

interface HistoryEntryRowProps {
  entry: HistoryEntry;
  isUndoable: boolean;
  undoRemainingMs: number;
  onUndoClick: () => void;
  isNew: boolean;
}

function HistoryEntryRow({
  entry,
  isUndoable,
  undoRemainingMs,
  onUndoClick,
  isNew,
}: HistoryEntryRowProps): React.JSX.Element {
  // Derived: status symbol (render-time)
  const statusSymbol: string = entry.status === "success" ? "\u2713" : "\u26A0";
  const statusLabel: string =
    entry.status === "success" ? "สำเร็จ" : "มีปัญหา";

  // Derived: countdown display
  const countdownSeconds: string = isUndoable
    ? (undoRemainingMs / 1000).toFixed(1)
    : "0.0";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-300",
        isNew && "animate-[history-slide-in_0.3s_ease-out]",
        entry.status === "success"
          ? "border-emerald-500/20"
          : "border-amber-500/20",
      )}
      role="listitem"
      aria-label={`หมายเลข ${entry.number} ${statusLabel}`}
    >
      {/* Number + status */}
      <Badge
        variant="outline"
        className={cn(
          "font-mono text-sm font-bold",
          entry.status === "success"
            ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            : "border-amber-500/30 text-amber-700 dark:text-amber-400",
        )}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {entry.number} {statusSymbol}
      </Badge>

      {/* Spacer */}
      <span className="flex-1" />

      {/* Undo button (explicit ternary, not &&) */}
      {isUndoable ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onUndoClick}
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
          aria-label={`เลิกทำ หมายเลข ${entry.number} (เหลือ ${countdownSeconds} วินาที)`}
        >
          <Undo2 className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">{countdownSeconds}s</span>
        </Button>
      ) : null}
    </div>
  );
}

// --- Main component ---

function HistoryStrip({
  entries,
  onUndo,
  maxItems = 5,
  className,
}: HistoryStripProps): React.JSX.Element {
  const [undoTargetId, setUndoTargetId] = useState<string | null>(null);

  // Track which entry IDs we've "seen" for the slide animation.
  // useRef for transient values that don't need re-render (Rule 18.5).
  const seenIdsRef = useRef<Set<string>>(new Set<string>());
  const prevEntriesLengthRef = useRef<number>(entries.length);

  // Derived: visible entries (render-time, no useEffect)
  const visibleEntries: readonly HistoryEntry[] = entries.slice(0, maxItems);

  // Determine which entries are "new" (not yet seen)
  const newIds = new Set<string>();
  for (const entry of visibleEntries) {
    if (!seenIdsRef.current.has(entry.id)) {
      newIds.add(entry.id);
    }
  }

  // After render, mark all as seen (this is safe in a ref update during render
  // since refs are not reactive). We'll update after commit via layout effect.
  React.useLayoutEffect(() => {
    for (const entry of visibleEntries) {
      seenIdsRef.current.add(entry.id);
    }
    prevEntriesLengthRef.current = entries.length;
  });

  const handleUndoExpire = useCallback((): void => {
    setUndoTargetId(null);
  }, []);

  const undoRemainingMs = useUndoCountdown(undoTargetId, handleUndoExpire);

  // When new entries arrive, make the newest one undoable
  React.useEffect(() => {
    if (visibleEntries.length > 0 && newIds.size > 0) {
      const newestEntry = visibleEntries[0];
      if (newestEntry !== undefined) {
        setUndoTargetId(newestEntry.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  const handleUndo = useCallback(
    (entryId: string): void => {
      setUndoTargetId(null);
      onUndo(entryId);
    },
    [onUndo],
  );

  return (
    <div
      className={cn("flex w-full flex-col gap-1.5", className)}
      role="list"
      aria-label="รายการบันทึกล่าสุด"
    >
      {visibleEntries.length > 0 ? (
        visibleEntries.map((entry) => (
          <HistoryEntryRow
            key={entry.id}
            entry={entry}
            isNew={newIds.has(entry.id)}
            isUndoable={undoTargetId === entry.id}
            undoRemainingMs={undoTargetId === entry.id ? undoRemainingMs : 0}
            onUndoClick={() => handleUndo(entry.id)}
          />
        ))
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          ยังไม่มีรายการ
        </p>
      )}

      {/* Inline keyframe for slide-in */}
      <style jsx={false}>{`
        @keyframes history-slide-in {
          0% { opacity: 0; transform: translateX(-24px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export { HistoryStrip };
export type { HistoryStripProps, HistoryEntry, EntryStatus };
