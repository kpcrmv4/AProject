"use client";

import * as React from "react";
import { useRef, useState, useCallback } from "react";
import { Delete, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Types (composition over boolean explosion) ---

interface NumberPadProps {
  /** Current display value */
  value: string;
  /** Called when the numeric value changes */
  onChange: (value: string) => void;
  /** Called when user confirms the entry */
  onSubmit: (value: string) => void;
  /** Whether the pad is disabled */
  disabled?: boolean;
  /** Maximum number of digits (default 3) */
  maxLength?: number;
  /** Optional className for the root container */
  className?: string;
}

type PadKey =
  | { kind: "digit"; digit: string }
  | { kind: "clear" }
  | { kind: "backspace" };

// --- Constants ---

const PAD_KEYS: PadKey[] = [
  { kind: "digit", digit: "1" },
  { kind: "digit", digit: "2" },
  { kind: "digit", digit: "3" },
  { kind: "digit", digit: "4" },
  { kind: "digit", digit: "5" },
  { kind: "digit", digit: "6" },
  { kind: "digit", digit: "7" },
  { kind: "digit", digit: "8" },
  { kind: "digit", digit: "9" },
  { kind: "clear" },
  { kind: "digit", digit: "0" },
  { kind: "backspace" },
];

// --- Helpers ---

function triggerHaptic(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function getPadKeyLabel(key: PadKey): React.ReactNode {
  switch (key.kind) {
    case "digit":
      return key.digit;
    case "clear":
      return "C";
    case "backspace":
      return <Delete className="size-7" aria-hidden="true" />;
  }
}

function getPadKeyAriaLabel(key: PadKey): string {
  switch (key.kind) {
    case "digit":
      return `หมายเลข ${key.digit}`;
    case "clear":
      return "ล้างทั้งหมด";
    case "backspace":
      return "ลบตัวสุดท้าย";
  }
}

// --- Component ---

function NumberPad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  maxLength = 3,
  className,
}: NumberPadProps): React.JSX.Element {
  const [animState, setAnimState] = useState<"idle" | "flash" | "shake">("idle");
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived state: whether submit is allowed (render-time, no useEffect)
  const canSubmit: boolean = value.length > 0 && !disabled;

  const clearAnimTimer = useCallback((): void => {
    if (animTimerRef.current !== null) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
  }, []);

  const flashSuccess = useCallback((): void => {
    clearAnimTimer();
    setAnimState("flash");
    animTimerRef.current = setTimeout(() => {
      setAnimState("idle");
      animTimerRef.current = null;
    }, 400);
  }, [clearAnimTimer]);

  const shakeError = useCallback((): void => {
    clearAnimTimer();
    setAnimState("shake");
    animTimerRef.current = setTimeout(() => {
      setAnimState("idle");
      animTimerRef.current = null;
    }, 500);
  }, [clearAnimTimer]);

  const handleKey = useCallback(
    (key: PadKey): void => {
      if (disabled) return;
      triggerHaptic(10);

      switch (key.kind) {
        case "digit": {
          if (value.length < maxLength) {
            onChange(value + key.digit);
          }
          break;
        }
        case "clear": {
          onChange("");
          break;
        }
        case "backspace": {
          onChange(value.slice(0, -1));
          break;
        }
      }
    },
    [disabled, value, maxLength, onChange],
  );

  const handleSubmit = useCallback((): void => {
    if (!canSubmit) {
      shakeError();
      triggerHaptic([50, 30, 50]);
      return;
    }
    flashSuccess();
    triggerHaptic([10, 50, 10]);
    onSubmit(value);
  }, [canSubmit, value, onSubmit, flashSuccess, shakeError]);

  return (
    <div
      className={cn("flex w-full max-w-sm flex-col gap-4", className)}
      role="group"
      aria-label="แป้นตัวเลข"
    >
      {/* Display */}
      <div
        className={cn(
          "flex min-h-[80px] items-center justify-center rounded-xl border-2 border-border bg-card px-4 transition-colors duration-200",
          animState === "flash" && "border-emerald-500 bg-emerald-500/10",
          animState === "shake" && "animate-[number-pad-shake_0.4s_ease-in-out]",
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        <span
          className="select-none text-center font-mono text-5xl font-bold tracking-widest text-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "48px" }}
        >
          {value.length > 0 ? value : (
            <span className="text-muted-foreground/40">{"---"}</span>
          )}
        </span>
      </div>

      {/* 3x4 Grid */}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="แป้นตัวเลข">
        {PAD_KEYS.map((key, index) => {
          const label = getPadKeyLabel(key);
          const ariaLabel = getPadKeyAriaLabel(key);
          const isClear = key.kind === "clear";

          return (
            <Button
              key={index}
              type="button"
              variant={isClear ? "destructive" : "outline"}
              disabled={disabled}
              onClick={() => handleKey(key)}
              aria-label={ariaLabel}
              className={cn(
                "min-h-[64px] min-w-[64px] text-2xl font-bold",
                "touch-manipulation select-none",
                "focus-visible:ring-4 focus-visible:ring-ring",
                isClear && "text-white",
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {label}
            </Button>
          );
        })}
      </div>

      {/* Confirm Button */}
      <Button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        aria-label="ยืนยันหมายเลข"
        className={cn(
          "min-h-[64px] w-full gap-3 text-xl font-bold",
          "touch-manipulation select-none",
          "bg-emerald-600 text-white hover:bg-emerald-700",
          "focus-visible:ring-4 focus-visible:ring-emerald-400",
          "disabled:bg-emerald-600/40 disabled:text-white/60",
        )}
      >
        <Check className="size-7" aria-hidden="true" />
        ยืนยัน
      </Button>

      {/* Inline keyframe for shake animation */}
      <style jsx={false}>{`
        @keyframes number-pad-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}

export { NumberPad };
export type { NumberPadProps };
