import type { RaceTimestamp, Penalty, DnfRecord } from "@/types";

export type RankedRacer = {
  racer_id: string;
  racer_name: string;
  racer_number: number;
  team: string | null;
  class_id: string;
  class_name: string;
  checkpoints: { checkpoint_id: string; checkpoint_name: string; time: string | null }[];
  total_seconds: number | null;
  penalty_seconds: number;
  final_seconds: number | null;
  rank: number | null;
  status: "racing" | "finished" | "dnf";
  gap: number | null;
};

export function calculateRankings(
  racers: {
    id: string;
    name: string;
    race_number: number;
    team: string | null;
    class_id: string;
    class_name: string;
  }[],
  timestamps: RaceTimestamp[],
  penalties: Penalty[],
  dnfRecords: DnfRecord[],
  checkpointOrder: { id: string; name: string }[]
): RankedRacer[] {
  // Build lookup maps for O(1) access (Rule 18.7)
  const timestampMap = new Map<string, RaceTimestamp>();
  for (const ts of timestamps) {
    timestampMap.set(`${ts.racer_id}:${ts.checkpoint_id}`, ts);
  }

  const penaltyMap = new Map<string, number>();
  for (const p of penalties) {
    penaltyMap.set(p.racer_id, (penaltyMap.get(p.racer_id) ?? 0) + p.seconds);
  }

  const dnfSet = new Set(dnfRecords.map((d) => d.racer_id));

  const results: RankedRacer[] = racers.map((racer) => {
    const isDnf = dnfSet.has(racer.id);
    const penaltySecs = penaltyMap.get(racer.id) ?? 0;

    const checkpoints = checkpointOrder.map((cp) => {
      const ts = timestampMap.get(`${racer.id}:${cp.id}`);
      return {
        checkpoint_id: cp.id,
        checkpoint_name: cp.name,
        time: ts?.recorded_at ?? null,
      };
    });

    // Total time = last checkpoint - first checkpoint
    const times = checkpoints
      .map((cp) => cp.time)
      .filter((t): t is string => t !== null);

    let totalSeconds: number | null = null;
    if (times.length >= 2) {
      const start = new Date(times[0]).getTime();
      const end = new Date(times[times.length - 1]).getTime();
      totalSeconds = Math.round((end - start) / 1000);
    }

    const finalSeconds =
      totalSeconds !== null ? totalSeconds + penaltySecs : null;

    return {
      racer_id: racer.id,
      racer_name: racer.name,
      racer_number: racer.race_number,
      team: racer.team,
      class_id: racer.class_id,
      class_name: racer.class_name,
      checkpoints,
      total_seconds: totalSeconds,
      penalty_seconds: penaltySecs,
      final_seconds: finalSeconds,
      rank: null,
      status: isDnf ? "dnf" : finalSeconds !== null ? "finished" : "racing",
      gap: null,
    };
  });

  // Sort: finished first (by time), then racing, then DNF
  const finished = results
    .filter((r) => r.status === "finished")
    .sort((a, b) => (a.final_seconds ?? 0) - (b.final_seconds ?? 0));

  const racing = results.filter((r) => r.status === "racing");
  const dnf = results.filter((r) => r.status === "dnf");

  const leaderTime = finished[0]?.final_seconds ?? null;
  finished.forEach((r, i) => {
    r.rank = i + 1;
    r.gap = leaderTime !== null && r.final_seconds !== null
      ? r.final_seconds - leaderTime
      : null;
  });

  return [...finished, ...racing, ...dnf];
}
