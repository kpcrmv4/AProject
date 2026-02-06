"use client";

import * as React from "react";
import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Types (composition pattern) ---

interface RaceClass {
  /** Unique identifier for this class */
  id: string;
  /** Display name of the class */
  name: string;
  /** Registration fee for this class */
  fee: number;
  /** Optional description */
  description?: string;
  /** Whether registration is still open */
  available?: boolean;
}

interface ClassSelectorProps {
  /** Available race classes */
  classes: readonly RaceClass[];
  /** Currently selected class IDs */
  selected: readonly string[];
  /** Called when selection changes */
  onChange: (selected: string[]) => void;
  /** Currency symbol (default "฿") */
  currency?: string;
  /** Optional className for the root container */
  className?: string;
}

// --- Helpers (pure functions for derived state) ---

function formatFee(amount: number, currency: string): string {
  return `${currency}${amount.toLocaleString("th-TH")}`;
}

function computeTotalFee(
  classes: readonly RaceClass[],
  selectedIds: readonly string[],
): number {
  const selectedSet = new Set(selectedIds);
  let total = 0;
  for (const cls of classes) {
    if (selectedSet.has(cls.id)) {
      total += cls.fee;
    }
  }
  return total;
}

function computeValidationMessage(
  selectedCount: number,
): string | null {
  if (selectedCount === 0) {
    return "กรุณาเลือกอย่างน้อย 1 คลาส";
  }
  return null;
}

// --- Component ---

function ClassSelector({
  classes,
  selected,
  onChange,
  currency = "\u0E3F",
  className,
}: ClassSelectorProps): React.JSX.Element {
  // --- Derived state during render (Rule 18.5: NOT useEffect) ---
  const selectedSet = new Set(selected);
  const totalFee: number = computeTotalFee(classes, selected);
  const formattedTotal: string = formatFee(totalFee, currency);
  const validationMessage: string | null = computeValidationMessage(selected.length);
  const hasSelection: boolean = selected.length > 0;

  // --- Handlers ---
  const handleToggle = useCallback(
    (classId: string): void => {
      const currentSet = new Set(selected);
      if (currentSet.has(classId)) {
        currentSet.delete(classId);
      } else {
        currentSet.add(classId);
      }
      onChange(Array.from(currentSet));
    },
    [selected, onChange],
  );

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardContent className="flex flex-col gap-1 p-0">
        {/* Class list */}
        <div
          className="flex flex-col divide-y divide-border"
          role="group"
          aria-label="เลือกคลาสการแข่งขัน"
        >
          {classes.map((cls) => {
            const isSelected: boolean = selectedSet.has(cls.id);
            const isAvailable: boolean = cls.available !== false;

            return (
              <label
                key={cls.id}
                className={cn(
                  "flex min-h-[64px] cursor-pointer items-center gap-4 px-4 py-3 transition-colors",
                  "hover:bg-accent/50",
                  "focus-within:bg-accent/50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring",
                  isSelected && "bg-primary/5",
                  !isAvailable && "cursor-not-allowed opacity-50",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(cls.id)}
                  disabled={!isAvailable}
                  aria-label={`${cls.name} - ${formatFee(cls.fee, currency)}`}
                  className="size-6 shrink-0"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {cls.name}
                  </span>
                  {/* Description (explicit ternary, not &&) */}
                  {cls.description !== undefined && cls.description.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {cls.description}
                    </span>
                  ) : null}
                </div>

                <Badge
                  variant={isSelected ? "default" : "secondary"}
                  className="shrink-0 font-mono tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {formatFee(cls.fee, currency)}
                </Badge>

                {/* Availability badge (explicit ternary) */}
                {!isAvailable ? (
                  <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                    เต็มแล้ว
                  </Badge>
                ) : null}
              </label>
            );
          })}
        </div>
      </CardContent>

      {/* Sticky total at bottom (mobile sticky) */}
      <CardFooter
        className={cn(
          "sticky bottom-0 flex flex-col gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm",
          "sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className="flex flex-col gap-1">
          {/* Validation message (explicit ternary) */}
          {validationMessage !== null ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {validationMessage}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              เลือกแล้ว {selected.length} คลาส
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            รวมทั้งหมด:
          </span>
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              hasSelection
                ? "text-foreground"
                : "text-muted-foreground",
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            aria-live="polite"
            aria-atomic="true"
          >
            {formattedTotal}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

export { ClassSelector };
export type { ClassSelectorProps, RaceClass };
