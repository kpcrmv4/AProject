"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { NumberPad } from "@/components/custom/NumberPad";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wifi, WifiOff, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTimeShort } from "@/lib/utils/format";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

// --- Sub-components (composition) ---

type LiveBadgeProps = {
  connected: boolean;
};

function LiveBadge({ connected }: LiveBadgeProps) {
  return connected ? (
    <Badge variant="default" className="gap-1.5 bg-emerald-600 px-3 py-1">
      <Wifi className="size-3.5" />
      <span className="text-xs">Live</span>
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1.5 px-3 py-1">
      <WifiOff className="size-3.5" />
      <span className="text-xs">Offline</span>
    </Badge>
  );
}

type HistoryEntry = {
  id: string;
  racer_number: string;
  racer_name: string;
  recorded_at: string;
  synced: boolean;
};

type HistoryStripProps = {
  entries: HistoryEntry[];
};

function HistoryStrip({ entries }: HistoryStripProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        ยังไม่มีการบันทึก
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "flex items-center justify-between rounded-lg border px-3 py-2 transition-all",
            entry.synced
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
              : "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950"
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-lg font-bold"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {entry.racer_number}
            </span>
            <span className="text-sm text-muted-foreground">
              {entry.racer_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {formatTimeShort(entry.recorded_at)}
            </span>
            {entry.synced ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <Clock className="size-4 animate-pulse text-orange-500" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Checkpoint info type ---
type CheckpointInfo = {
  id: string;
  name: string;
  event_name: string;
  event_slug: string;
};

// --- Loading skeleton ---
function StaffSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-80 w-full max-w-sm" />
    </div>
  );
}

// --- Main page ---
export default function StaffCheckpointPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [checkpoint, setCheckpoint] = useState<CheckpointInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [racerNumber, setRacerNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const historyRef = useRef(history);
  historyRef.current = history;

  // Validate code and get checkpoint info
  const validateCode = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const json: ApiResponse<CheckpointInfo> = await res.json();

      if (json.error) {
        setError(json.error.message ?? "รหัสไม่ถูกต้องหรือหมดอายุ");
        setLoading(false);
        return;
      }

      setCheckpoint(json.data);
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    validateCode();
  }, [validateCode]);

  // Fetch recent history
  useEffect(() => {
    if (!checkpoint) return;

    async function fetchHistory() {
      try {
        const res = await fetch(
          `/api/staff/checkpoint/${checkpoint!.id}/history`
        );
        const json: ApiResponse<HistoryEntry[]> = await res.json();
        if (!json.error) {
          setHistory(json.data);
        }
      } catch {
        // Silent fail for history
      }
    }

    fetchHistory();
  }, [checkpoint]);

  // Real-time subscription for sync status
  useEffect(() => {
    if (!checkpoint) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`staff-cp-${checkpoint.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "timestamps",
          filter: `checkpoint_id=eq.${checkpoint.id}`,
        },
        (payload) => {
          // Mark entries as synced when we see them come through
          const newTs = payload.new as { id: string; racer_id: string };
          setHistory((prev) =>
            prev.map((entry) =>
              entry.id === newTs.id ? { ...entry, synced: true } : entry
            )
          );
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkpoint]);

  // Handle racer number submit
  async function handleSubmit(value: string) {
    if (!checkpoint) return;
    if (value.trim() === "") return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/staff/checkpoint/${checkpoint.id}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          racer_number: Number(value),
          checkpoint_id: checkpoint.id,
        }),
      });

      const json: ApiResponse<{
        id: string;
        racer_name: string;
        recorded_at: string;
      }> = await res.json();

      if (json.error) {
        toast.error(json.error.message ?? "ไม่พบเบอร์นักแข่ง");
        setRacerNumber("");
        setSubmitting(false);
        return;
      }

      // Add to history
      const newEntry: HistoryEntry = {
        id: json.data.id,
        racer_number: value,
        racer_name: json.data.racer_name,
        recorded_at: json.data.recorded_at,
        synced: true,
      };

      setHistory((prev) => [newEntry, ...prev].slice(0, 20));
      setRacerNumber("");
      toast.success(`บันทึกเบอร์ ${value} สำเร็จ`);
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <StaffSkeleton />;
  }

  if (error !== null || checkpoint === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-center">
          <p className="text-lg font-bold text-destructive">
            {error ?? "ไม่สามารถเข้าถึง Checkpoint ได้"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            รหัสอาจไม่ถูกต้องหรือหมดอายุแล้ว
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/staff")}>
          กลับหน้าใส่รหัส
        </Button>
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <MapPin className="size-5 text-emerald-600" />
          <div>
            <p className="font-bold leading-tight">{checkpoint.name}</p>
            <p className="text-xs text-muted-foreground">
              {checkpoint.event_name}
            </p>
          </div>
        </div>
        <LiveBadge connected={connected} />
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-6">
        {/* NumberPad */}
        <NumberPad
          value={racerNumber}
          onChange={setRacerNumber}
          onSubmit={handleSubmit}
          disabled={submitting}
          maxLength={3}
        />

        {/* History */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            บันทึกล่าสุด ({history.length})
          </h2>
          <HistoryStrip entries={history} />
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}
