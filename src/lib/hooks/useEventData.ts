"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Event, RaceClass, Checkpoint } from "@/types/database";

interface UseEventDataReturn {
  event: Event | null;
  classes: RaceClass[];
  checkpoints: Checkpoint[];
  isLoading: boolean;
  error: string | null;
}

export function useEventData(slug: string | null): UseEventDataReturn {
  const [event, setEvent] = useState<Event | null>(null);
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function fetchEventData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch event by slug
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug!)
          .single();

        if (eventError) {
          if (!cancelled) setError(eventError.message);
          return;
        }

        if (!eventData) {
          if (!cancelled) setError("Event not found");
          return;
        }

        if (cancelled) return;

        const eventRecord = eventData as unknown as Event;
        setEvent(eventRecord);

        // Fetch classes and checkpoints in parallel
        const [classesResult, checkpointsResult] = await Promise.all([
          supabase
            .from("classes")
            .select("*")
            .eq("event_id", eventRecord.id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("checkpoints")
            .select("*")
            .eq("event_id", eventRecord.id)
            .order("sort_order", { ascending: true }),
        ]);

        if (cancelled) return;

        if (classesResult.error) {
          setError(classesResult.error.message);
          return;
        }

        if (checkpointsResult.error) {
          setError(checkpointsResult.error.message);
          return;
        }

        setClasses((classesResult.data as unknown as RaceClass[]) ?? []);
        setCheckpoints(
          (checkpointsResult.data as unknown as Checkpoint[]) ?? []
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch event data"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchEventData();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { event, classes, checkpoints, isLoading, error };
}
