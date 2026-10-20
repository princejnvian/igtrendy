"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function PresenceHeartbeat() {
  useEffect(() => {
    let active = true;
    let interval: number | undefined;

    async function start() {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;

      const ping = () => {
        void fetch("/api/presence", { method: "POST", cache: "no-store" }).catch(() => undefined);
      };
      ping();
      interval = window.setInterval(ping, 30000);
    }

    void start();
    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  return null;
}