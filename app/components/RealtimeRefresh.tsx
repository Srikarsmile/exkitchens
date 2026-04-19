"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RealtimeTarget {
  table: string;
  filter?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
}

interface RealtimeRefreshProps {
  channel: string;
  targets: RealtimeTarget[];
  pollMs?: number;
  enabled?: boolean;
}

export default function RealtimeRefresh({
  channel,
  targets,
  pollMs,
  enabled = true,
}: RealtimeRefreshProps) {
  const router = useRouter();
  const encodedTargets = useMemo(() => JSON.stringify(targets), [targets]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) {
        return;
      }

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        router.refresh();
      }, 350);
    };

    let supabase;

    try {
      supabase = createClient();
    } catch {
      return;
    }

    const realtimeChannel = targets.reduce((acc, target) => {
      return acc.on(
        "postgres_changes",
        {
          event: target.event ?? "*",
          schema: target.schema ?? "public",
          table: target.table,
          filter: target.filter,
        },
        scheduleRefresh,
      );
    }, supabase.channel(channel));

    realtimeChannel.subscribe();

    const intervalId = pollMs ? window.setInterval(scheduleRefresh, pollMs) : null;

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      void supabase.removeChannel(realtimeChannel);
    };
  }, [channel, encodedTargets, enabled, pollMs, router, targets]);

  return null;
}
