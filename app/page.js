"use client";

import { useEffect, useState } from "react";
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
  updateGigStatus,
} from "../utils/supabase/gigs";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editingGigId, setEditingGigId] = useState(null);
  const [inputMode, setInputMode] = useState("new");
  const [savedClubs, setSavedClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState("");

  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [distance, setDistance] = useState("");
  const [fee, setFee] = useState("");
  const [status, setStatus] = useState("Planned");
  const [notes, setNotes] = useState("");
  const [gigs, setGigs] = useState([]);
  const [costPerKm, setCostPerKm] = useState(0.25);

  const [venueFilter, setVenueFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  function applySavedClub(clubId) {
    const club = savedClubs.find((item) => String(item.id) === String(clubId));
    if (!club) return;

    setVenue(club.club_name || "");
    setCity(club.city || "");
    setDistance(String(club.distance ?? ""));
    setFee(String(club.default_fee ?? ""));
  }

  function resetForm() {
    setEditingGigId(null);
    setInputMode("new");
    setSelectedClubId("");
    setEventDate("");
    setVenue("");
    setCity("");
    setDistance("");
    setFee("");
    setStatus("Planned");
    setNotes("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const distanceNumber = Number(distance);
      const feeNumber = Number(fee);
      const travelCost = distanceNumber * costPerKm;
      const netProfit = feeNumber - travelCost;

      if (editingGigId) {
        const updatedGig = await updateGig(editingGigId, {
          club_id: null,
          event_date: eventDate,
          venue,
          city,
          distance: distanceNumber,
          fee: feeNumber,
          status,
          travel_cost: travelCost,
          net_profit: netProfit,
          notes,
        });

        const updatedGigs = gigs.map((gig) =>
          gig.id === editingGigId ? updatedGig : gig
        );

        setGigs(updatedGigs);
        resetForm();
        return;
      }

      const newGig = await createGig({
        club_id: inputMode === "saved" ? selectedClubId || null : null,
        event_date: eventDate,
        venue,
        city,
        distance: distanceNumber,
        fee: feeNumber,
        status,
        travel_cost: travelCost,
        net_profit: netProfit,
        notes,
      });

      const updatedGigs = [newGig, ...gigs];
      setGigs(updatedGigs);
      resetForm();
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

      const updatedGigs = gigs.filter((gig) => gig.id !== id);
      setGigs(updatedGigs);

      if (editingGigId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to delete gig:", error);
      alert("Delete failed.");
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      const updatedGig = await updateGigStatus(id, newStatus);
      const updatedGigs = gigs.map((gig) => (gig.id === id ? updatedGig : gig));
      setGigs(updatedGigs);
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Status update failed.");
    }
  }

  function handleEditGig(gig) {
    setEditingGigId(gig.id);
    setInputMode("new");
    setSelectedClubId("");
    setEventDate(gig.eventDate);
    setVenue(gig.venue);
    setCity(gig.city);
    setDistance(String(gig.distance));
    setFee(String(gig.fee));
    setStatus(gig.status);
    setNotes(gig.notes || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const filteredGigs = gigs.filter((gig) => {
    const gigVenue = gig.venue?.toLowerCase() || "";
    const gigDate = gig.eventDate || "";

    const matchVenue =
      !venueFilter || gigVenue.includes(venueFilter.toLowerCase());

    const matchFrom = !dateFrom || gigDate >= dateFrom;
    const matchTo = !dateTo || gigDate <= dateTo;

    return matchVenue && matchFrom && matchTo;
  });

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <TopNav />

        <h1 className="text-4xl font-bold mb-2">DJ Gigs Manager</h1>
        <p className="text-zinc-400 mb-8">
          Your complete overview of DJ gigs.
        </p>

        <GigForm
          editingGigId={editingGigId}
          inputMode={inputMode}
          setInputMode={setInputMode}
          savedClubs={savedClubs}
          selectedClubId={selectedClubId}
          setSelectedClubId={setSelectedClubId}
          applySavedClub={applySavedClub}
          eventDate={eventDate}
          setEventDate={setEventDate}
          venue={venue}
          setVenue={setVenue}
          city={city}
          setCity={setCity}
          distance={distance}
          setDistance={setDistance}
          fee={fee}
          setFee={setFee}
          status={status}
          setStatus={setStatus}
          notes={notes}
          setNotes={setNotes}
          handleSubmit={handleSubmit}
          resetForm={resetForm}
        />

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
                    handleStatusChange={handleStatusChange}
                    handleEditGig={handleEditGig}
                    handleDeleteGig={handleDeleteGig}
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