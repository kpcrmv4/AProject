"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import type { Event, RaceClass } from "@/types";
import type { ApiResponse } from "@/types/api";
import type { RankedRacer } from "@/lib/utils/calculate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Timer,
  Trophy,
  Wifi,
  WifiOff,
  Calendar,
  ArrowUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// --- Sub-components (composition) ---

type LiveBadgeProps = {
  connected: boolean;
};

function LiveBadge({ connected }: LiveBadgeProps) {
  return connected ? (
    <Badge variant="default" className="gap-1.5 bg-emerald-600 px-3 py-1.5">
      <Wifi className="size-3.5" />
      <span className="text-xs font-medium">Live</span>
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1.5 px-3 py-1.5">
      <WifiOff className="size-3.5" />
      <span className="text-xs font-medium">Offline</span>
    </Badge>
  );
}

type LeaderboardRowProps = {
  racer: RankedRacer;
  isNew?: boolean;
};

function LeaderboardRow({ racer, isNew = false }: LeaderboardRowProps) {
  const isTop3 = racer.rank !== null && racer.rank <= 3;

  function getRankStyle(rank: number | null): string {
    if (rank === null) return "";
    switch (rank) {
      case 1:
        return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300";
      case 2:
        return "bg-gray-100 dark:bg-gray-800/30 border-gray-300";
      case 3:
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-300";
      default:
        return "";
    }
  }

  function getRankIcon(rank: number | null): React.ReactNode {
    if (rank === null) return "-";
    if (rank === 1) return <Trophy className="size-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="size-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="size-5 text-amber-600" />;
    return `#${rank}`;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-500 sm:px-4",
        isTop3 ? getRankStyle(racer.rank) : "",
        racer.status === "dnf" ? "opacity-50" : "",
        isNew ? "animate-[leaderboard-flash_1s_ease-in-out]" : ""
      )}
    >
      {/* Rank */}
      <div className="flex w-10 items-center justify-center font-mono text-sm font-bold sm:w-12">
        {getRankIcon(racer.rank)}
      </div>

      {/* Number */}
      <div
        className="flex w-12 items-center justify-center rounded bg-muted px-2 py-1 font-mono text-lg font-bold sm:w-14"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {racer.racer_number}
      </div>

      {/* Name and team */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{racer.racer_name}</p>
        {racer.team !== null ? (
          <p className="truncate text-xs text-muted-foreground">
            {racer.team}
          </p>
        ) : null}
      </div>

      {/* Status / Time */}
      <div className="flex items-center gap-2 text-right">
        {racer.status === "dnf" ? (
          <Badge variant="destructive" className="text-xs">
            DNF
          </Badge>
        ) : racer.status === "finished" ? (
          <div className="flex flex-col items-end">
            <span className="font-mono text-sm font-bold">
              {racer.final_seconds !== null
                ? formatDuration(racer.final_seconds)
                : "-"}
            </span>
            {racer.gap !== null && racer.gap > 0 ? (
              <span className="font-mono text-xs text-muted-foreground">
                +{formatDuration(racer.gap)}
              </span>
            ) : null}
            {racer.penalty_seconds > 0 ? (
              <span className="font-mono text-xs text-orange-500">
                (P: +{racer.penalty_seconds}s)
              </span>
            ) : null}
          </div>
        ) : (
          <Badge variant="secondary" className="animate-pulse text-xs">
            Racing
          </Badge>
        )}
      </div>
    </div>
  );
}

// --- Skeleton ---

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// --- Main page ---

export default function LiveResultsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [event, setEvent] = useState<Event | null>(null);
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [rankings, setRankings] = useState<RankedRacer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedClass, setSelectedClass] = useState("all");
  const [newRacerIds, setNewRacerIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, classesRes, resultsRes] = await Promise.all([
        fetch(`/api/events/${slug}`),
        fetch(`/api/events/${slug}/classes`),
        fetch(`/api/events/${slug}/results`),
      ]);

      const eventJson: ApiResponse<Event> = await eventRes.json();
      const classesJson: ApiResponse<RaceClass[]> = await classesRes.json();
      const resultsJson: ApiResponse<RankedRacer[]> = await resultsRes.json();

      if (eventJson.error) {
        setError(eventJson.error.message);
        return;
      }

      setEvent(eventJson.data);
      setClasses(classesJson.error ? [] : classesJson.data);
      setRankings(resultsJson.error ? [] : resultsJson.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`results-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timestamps" },
        () => {
          // Refetch rankings on any timestamp change
          fetchResults();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dnf_records" },
        () => {
          fetchResults();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "penalties" },
        () => {
          fetchResults();
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    async function fetchResults() {
      try {
        const res = await fetch(`/api/events/${slug}/results`);
        const json: ApiResponse<RankedRacer[]> = await res.json();
        if (!json.error) {
          // Detect newly finished racers for animation
          const prevFinished = new Set(
            rankings
              .filter((r) => r.status === "finished")
              .map((r) => r.racer_id)
          );
          const newFinished = json.data
            .filter(
              (r) => r.status === "finished" && !prevFinished.has(r.racer_id)
            )
            .map((r) => r.racer_id);

          if (newFinished.length > 0) {
            setNewRacerIds(new Set(newFinished));
            setTimeout(() => setNewRacerIds(new Set()), 2000);
          }

          setRankings(json.data);
        }
      } catch {
        // Silent fail for realtime updates
      }
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug, rankings, fetchData]);

  // Filter by class
  const filteredRankings = useMemo(() => {
    if (selectedClass === "all") return rankings;
    return rankings.filter((r) => r.class_id === selectedClass);
  }, [rankings, selectedClass]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredRankings.length;
    const finished = filteredRankings.filter(
      (r) => r.status === "finished"
    ).length;
    const racing = filteredRankings.filter(
      (r) => r.status === "racing"
    ).length;
    return { total, finished, racing };
  }, [filteredRankings]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="mb-6 h-10 w-48" />
        <ResultsSkeleton />
      </div>
    );
  }

  if (error !== null || event === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8 text-center text-destructive">
            {error ?? "ไม่พบงานแข่ง"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Timer className="size-6 text-emerald-600" />
            <div>
              <h1 className="text-lg font-bold leading-tight">
                {event.name}
              </h1>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                {formatDate(event.race_date)}
              </div>
            </div>
          </div>
          <LiveBadge connected={connected} />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-4">
        {/* Class filter tabs */}
        {classes.length > 1 ? (
          <Tabs
            value={selectedClass}
            onValueChange={setSelectedClass}
            className="mb-4"
          >
            <TabsList className="w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="text-xs">
                ทุกรุ่น
              </TabsTrigger>
              {classes.map((cls) => (
                <TabsTrigger
                  key={cls.id}
                  value={cls.id}
                  className="text-xs"
                >
                  {cls.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}

        {/* Summary stats */}
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            ทั้งหมด: <strong>{stats.total}</strong>
          </span>
          <span>
            เข้าเส้นชัย: <strong className="text-emerald-600">{stats.finished}</strong>
          </span>
          <span>
            กำลังแข่ง: <strong className="text-blue-600">{stats.racing}</strong>
          </span>
        </div>

        {/* Leaderboard */}
        {filteredRankings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <ArrowUp className="size-8 animate-bounce text-muted-foreground" />
              <p className="text-muted-foreground">
                รอข้อมูลจาก Checkpoint...
              </p>
              <p className="text-xs text-muted-foreground">
                ผลจะอัพเดทอัตโนมัติเมื่อมีข้อมูล
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredRankings.map((racer) => (
              <LeaderboardRow
                key={racer.racer_id}
                racer={racer}
                isNew={newRacerIds.has(racer.racer_id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Animation keyframe */}
      <style>{`
        @keyframes leaderboard-flash {
          0% { background-color: rgba(16, 185, 129, 0.2); transform: scale(1.02); }
          50% { background-color: rgba(16, 185, 129, 0.1); }
          100% { background-color: transparent; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
