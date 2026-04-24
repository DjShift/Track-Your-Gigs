"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../utils/supabase/client";

export default function SavedClubsPanel() {
  const supabase = useMemo(() => createClient(), []);

  const [clubs, setClubs] = useState([]);
  const [editingClubId, setEditingClubId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [clubName, setClubName] = useState("");
  const [city, setCity] = useState("");
  const [distance, setDistance] = useState("");
  const [defaultFee, setDefaultFee] = useState("");

  async function loadClubs() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load clubs:", error);
      setLoading(false);
      return;
    }

    setClubs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadClubs();
  }, []);

  function resetForm() {
    setEditingClubId(null);
    setClubName("");
    setCity("");
    setDistance("");
    setDefaultFee("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("You must be logged in.");
      return;
    }

    if (editingClubId) {
      const { error } = await supabase
        .from("clubs")
        .update({
          club_name: clubName,
          city,
          distance: Number(distance),
          default_fee: Number(defaultFee),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingClubId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to update club:", error);
        alert("Update failed.");
        return;
      }

      await loadClubs();
      resetForm();
      return;
    }

    const { error } = await supabase.from("clubs").insert({
      user_id: user.id,
      club_name: clubName,
      city,
      distance: Number(distance),
      default_fee: Number(defaultFee),
    });

    if (error) {
      console.error("Failed to create club:", error);
      alert("Creating club failed.");
      return;
    }

    await loadClubs();
    resetForm();
  }

  function handleEditClub(club) {
    setEditingClubId(club.id);
    setClubName(club.club_name || "");
    setCity(club.city || "");
    setDistance(String(club.distance ?? ""));
    setDefaultFee(String(club.default_fee ?? ""));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteClub(id) {
    const confirmed = window.confirm("Are you sure you want to delete this club?");
    if (!confirmed) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("You must be logged in.");
      return;
    }

    const { error } = await supabase
      .from("clubs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete club:", error);
      alert("Delete failed.");
      return;
    }

    await loadClubs();

    if (editingClubId === id) {
      resetForm();
    }
  }

  return (
    <div className="app-panel border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4">Saved Clubs</h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block mb-1 text-sm text-zinc-300">Club Name</label>
          <input
            type="text"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
            placeholder="e.g. Rio"
            required
          />
        </div>

        <div>
          <label className="block mb-1 text-sm text-zinc-300">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
            placeholder="e.g. Nitra"
            required
          />
        </div>

        <div>
          <label className="block mb-1 text-sm text-zinc-300">
            Distance (km)
          </label>
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
            placeholder="e.g. xx"
            required
          />
        </div>

        <div>
          <label className="block mb-1 text-sm text-zinc-300">
            Default Fee (€)
          </label>
          <input
            type="number"
            value={defaultFee}
            onChange={(e) => setDefaultFee(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
            placeholder="e.g. xxx"
            required
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 transition rounded-lg px-5 py-2 font-medium"
          >
            {editingClubId ? "Save Club" : "Add Club"}
          </button>

          {editingClubId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-zinc-700 hover:bg-zinc-600 transition rounded-lg px-5 py-2 font-medium"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-zinc-500">Loading clubs...</p>
      ) : (
        <div className="space-y-4">
          {clubs.length === 0 ? (
            <p className="text-zinc-500">No saved clubs yet.</p>
          ) : (
            clubs.map((club) => (
              <div
                key={club.id}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{club.club_name}</h3>
                    <p className="text-zinc-400">{club.city}</p>

                    <div className="mt-3 text-sm text-zinc-300 space-y-1">
                      <p>Distance: {club.distance} km</p>
                      <p>Default Fee: {club.default_fee} €</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClub(club)}
                      className="bg-blue-600 hover:bg-blue-500 transition rounded-lg px-4 py-2 text-sm font-medium"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClub(club.id)}
                      className="bg-red-600 hover:bg-red-500 transition rounded-lg px-4 py-2 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}