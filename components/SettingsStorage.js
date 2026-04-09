"use client";

import { useEffect, useState } from "react";
import { createClient } from "../utils/supabase/client";

export default function SettingsStorage() {
  const supabase = createClient();

  const [costPerKm, setCostPerKm] = useState("0.25");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
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
        .select("cost_per_km")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load settings:", error);
        setLoading(false);
        return;
      }

      if (!data) {
        const { error: insertError } = await supabase.from("settings").insert({
          user_id: user.id,
          cost_per_km: 0.25,
        });

        if (insertError) {
          console.error("Failed to create default settings:", insertError);
        } else {
          setCostPerKm("0.25");
        }

        setLoading(false);
        return;
      }

      setCostPerKm(String(data.cost_per_km ?? 0.25));
      setLoading(false);
    }

    loadSettings();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("You must be logged in.");
      setSaving(false);
      return;
    }

    const numericValue = Number(costPerKm);

    const { error } = await supabase.from("settings").upsert(
      {
        user_id: user.id,
        cost_per_km: numericValue,
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      console.error("Failed to save settings:", error);
      alert("Saving failed.");
      setSaving(false);
      return;
    }

    alert("Settings saved.");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Travel Cost Settings</h2>
        <p className="text-zinc-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4">Travel Cost Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 text-sm text-zinc-300">
            Cost per km (€)
          </label>
          <input
            type="number"
            step="0.01"
            value={costPerKm}
            onChange={(e) => setCostPerKm(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition rounded-lg px-5 py-2 font-medium"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}