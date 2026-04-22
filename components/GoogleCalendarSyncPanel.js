"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../utils/supabase/client";

export default function GoogleCalendarSyncPanel() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadCalendarStatus() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("settings")
        .select("google_calendar_connected, google_calendar_email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load Google Calendar status:", error);
        setLoading(false);
        return;
      }

      setConnected(Boolean(data?.google_calendar_connected));
      setEmail(data?.google_calendar_email || "");
      setLoading(false);
    }

    loadCalendarStatus();
  }, [supabase]);

  function handleGoogleCalendarSync() {
    setConnecting(true);
    window.location.href = "/api/google-calendar/connect";
  }

  if (loading) {
    return (
      <div className="app-panel border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Google Calendar Sync</h2>
        <p className="text-zinc-500">Loading sync status...</p>
      </div>
    );
  }

  return (
    <div className="app-panel border border-zinc-800 rounded-2xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Google Calendar Sync</h2>
          <p className="text-zinc-400 text-sm">
            Connect your Google Calendar and sync your gigs there.
          </p>

          {connected ? (
            <p className="text-sm text-green-400 mt-3">
              Connected{email ? ` as ${email}` : ""}.
            </p>
          ) : (
            <p className="text-sm text-zinc-500 mt-3">Not connected.</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleGoogleCalendarSync}
          disabled={connecting}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition rounded-lg px-5 py-3 font-medium text-white"
        >
          {connecting
            ? "Connecting..."
            : connected
            ? "Reconnect Google Calendar"
            : "Sync with Google Calendar"}
        </button>
      </div>
    </div>
  );
}