"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  RealtimePostgresChangesFilter,
} from "@supabase/realtime-js";
import type { Database } from "@/types/database";

type ConnectionStatus = "live" | "syncing" | "offline" | "error";

type TableName = keyof Database["public"]["Tables"];

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeOptions<T extends TableName> {
  table: T;
  event?: RealtimeEvent | "*";
  filter?: string;
  schema?: string;
  onInsert?: (
    payload: Database["public"]["Tables"][T]["Row"]
  ) => void;
  onUpdate?: (
    payload: Database["public"]["Tables"][T]["Row"]
  ) => void;
  onDelete?: (
    payload: Database["public"]["Tables"][T]["Row"]
  ) => void;
  onChange?: (
    payload: RealtimePostgresChangesPayload<
      Database["public"]["Tables"][T]["Row"]
    >
  ) => void;
  enabled?: boolean;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export function useRealtime<T extends TableName>(
  options: UseRealtimeOptions<T>
) {
  const {
    table,
    event = "*",
    filter,
    schema = "public",
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef(createClient());

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    cleanup();

    if (!enabled) {
      setStatus("offline");
      return;
    }

    setStatus("syncing");

    const supabase = supabaseRef.current;

    const channelName = `realtime:${schema}:${table}:${filter ?? "all"}`;

    // Build the typed filter for postgres_changes
    const pgFilter: RealtimePostgresChangesFilter<`${typeof event}`> = {
      event,
      schema,
      table: table as string,
      ...(filter ? { filter } : {}),
    };

    type RowType = Database["public"]["Tables"][T]["Row"];

    const channel = supabase
      .channel(channelName)
      .on<RowType>(
        "postgres_changes",
        pgFilter,
        (payload: RealtimePostgresChangesPayload<RowType>) => {
          onChange?.(payload);

          const newRecord = payload.new as RowType | undefined;
          const oldRecord = payload.old as RowType | undefined;

          switch (payload.eventType) {
            case "INSERT":
              if (newRecord) onInsert?.(newRecord);
              break;
            case "UPDATE":
              if (newRecord) onUpdate?.(newRecord);
              break;
            case "DELETE":
              if (oldRecord) onDelete?.(oldRecord);
              break;
          }
        }
      )
      .subscribe((subscriptionStatus) => {
        switch (subscriptionStatus) {
          case "SUBSCRIBED":
            setStatus("live");
            retryCountRef.current = 0;
            break;
          case "CHANNEL_ERROR":
            setStatus("error");
            scheduleReconnect();
            break;
          case "TIMED_OUT":
            setStatus("error");
            scheduleReconnect();
            break;
          case "CLOSED":
            setStatus("offline");
            break;
        }
      });

    channelRef.current = channel;
  }, [table, event, filter, schema, onInsert, onUpdate, onDelete, onChange, enabled, cleanup]);

  const scheduleReconnect = useCallback(() => {
    if (retryTimeoutRef.current) return;

    const backoff = Math.min(
      BASE_BACKOFF_MS * Math.pow(2, retryCountRef.current),
      MAX_BACKOFF_MS
    );

    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      retryCountRef.current += 1;
      subscribe();
    }, backoff);
  }, [subscribe]);

  useEffect(() => {
    subscribe();
    return cleanup;
  }, [subscribe, cleanup]);

  return { status };
}
