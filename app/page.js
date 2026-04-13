"use client";

import { useEffect, useMemo, useState } from "react";
import GigForm from "../components/GigForm";
import GigCard from "../components/GigCard";
import TopNav from "../components/TopNav";
import {
  loadSavedClubs,
  loadGigs,
  loadCostPerKm,
  createGig,
  updateGig,
  deleteGigById,
} from "../utils/supabase/gigs";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [savedClubs, setSavedClubs] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [costPerKm, setCostPerKm] = useState(0.25);

  const [venueFilter, setVenueFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showGigForm, setShowGigForm] = useState(false);
  const [editingGig, setEditingGig] = useState(null);

  async function loadInitialData() {
    setLoading(true);

    try {
      const [clubs, gigsData, cost] = await Promise.all([
        loadSavedClubs(),
        loadGigs(),
        loadCostPerKm(),
      ]);

      setSavedClubs(clubs);
      setGigs(gigsData);
      setCostPerKm(cost);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setLoading(false);
      setMounted(true);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  function closeGigForm() {
    setShowGigForm(false);
    setEditingGig(null);
  }

  function openNewGigForm() {
    setEditingGig(null);
    setShowGigForm(true);
  }

  function handleEditGig(gig) {
    setEditingGig(gig);
    setShowGigForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveGig(gigData) {
    try {
      const oneWayDistance = Number(gigData.distance || 0);
      const roundTripDistance = oneWayDistance * 2;
      const travelCost = roundTripDistance * costPerKm;
      const extraCosts = Number(gigData.extraCosts || 0);
      const totalCosts = travelCost + extraCosts;
      const netProfit = Number(gigData.fee || 0) - totalCosts;

      const payload = {
        club_id: null,
        event_date: gigData.eventDate,
        venue: gigData.venue,
        city: gigData.city,
        distance: oneWayDistance,
        fee: Number(gigData.fee || 0),
        status: gigData.status,
        travel_cost: travelCost,
        extra_costs: extraCosts,
        extra_costs_note: gigData.extraCostsNote || "",
        net_profit: netProfit,
        notes: gigData.notes || "",
        start_time: gigData.startTime || "22:00",
        end_time: gigData.endTime || "04:00",
        duration_hours: Number(gigData.durationHours || 6),
      };

      if (editingGig?.id) {
        const updatedGig = await updateGig(editingGig.id, payload);

        setGigs((prev) =>
          prev.map((gig) => (gig.id === editingGig.id ? updatedGig : gig))
        );

        closeGigForm();
        return;
      }

      const newGig = await createGig(payload);

      setGigs((prev) => [newGig, ...prev]);
      closeGigForm();
    } catch (error) {
      console.error("Failed to save gig:", error);
      alert("Saving gig failed.");
    }
  }

  async function handleDeleteGig(id) {
    const confirmed = window.confirm("Are you sure you want to delete this gig?");
    if (!confirmed) return;

    try {
      await deleteGigById(id);

      setGigs((prev) => prev.filter((gig) => gig.id !== id));

      if (editingGig?.id === id) {
        closeGigForm();
      }
    } catch (error) {
      console.error("Failed to delete gig:", error);
      alert("Delete failed.");
    }
  }

  function handleThisMonth() {
    const now = new Date();

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    setDateFrom(firstDay);
    setDateTo(lastDay);
  }

  function clearFilters() {
    setVenueFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const filteredGigs = useMemo(() => {
    return gigs.filter((gig) => {
      const gigVenue = gig.venue?.toLowerCase() || "";
      const gigDate = gig.eventDate || gig.event_date || "";

      const matchVenue =
        !venueFilter || gigVenue.includes(venueFilter.toLowerCase());

      const matchFrom = !dateFrom || gigDate >= dateFrom;
      const matchTo = !dateTo || gigDate <= dateTo;

      return matchVenue && matchFrom && matchTo;
    });
  }, [gigs, venueFilter, dateFrom, dateTo]);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <TopNav />

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">DJ Gigs Manager</h1>
            <p className="text-zinc-400">Your complete overview of DJ gigs.</p>
          </div>

          <button
            type="button"
            onClick={openNewGigForm}
            className="bg-purple-600 hover:bg-purple-500 transition rounded-xl px-5 py-3 text-sm font-medium"
          >
            Add Gig
          </button>
        </div>

        {showGigForm && (
          <GigForm
            gig={editingGig}
            selectedDate=""
            savedClubs={savedClubs}
            costPerKm={costPerKm}
            onSave={handleSaveGig}
            onCancel={closeGigForm}
          />
        )}

        {!mounted || loading ? (
          <p className="text-zinc-500">Loading gigs...</p>
        ) : (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 space-y-4">
              <h2 className="text-xl font-semibold">Filters</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm text-zinc-300">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={venueFilter}
                    onChange={(e) => setVenueFilter(e.target.value)}
                    placeholder="Search venue..."
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
                  />
                </div>

                <div className="flex gap-2 items-end">
                  <button
                    type="button"
                    onClick={handleThisMonth}
                    className="bg-purple-600 hover:bg-purple-500 transition rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    This month
                  </button>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="bg-zinc-700 hover:bg-zinc-600 transition rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    Clear
                  </button>
                </div>

                <div>
                  <label className="block mb-1 text-sm text-zinc-300">
                    Date from
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm text-zinc-300">
                    Date to
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Gig List</h2>

              {filteredGigs.length === 0 ? (
                <p className="text-zinc-500">No gigs found.</p>
              ) : (
                filteredGigs.map((gig) => (
                  <GigCard
                    key={gig.id}
                    gig={gig}
                    onEdit={handleEditGig}
                    onDelete={handleDeleteGig}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}