"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GigForm from "./GigForm";
import {
  loadSavedClubs,
  loadGigs,
  loadCostPerKm,
  createGig,
  updateGig,
  deleteGigById,
} from "../utils/supabase/gigs";

export default function CalendarGrid({ gigs = [], setGigs }) {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(0);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDayGigs, setSelectedDayGigs] = useState([]);
  const [editingGigId, setEditingGigId] = useState(null);
  const [isAddingGig, setIsAddingGig] = useState(false);

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
  const [costPerKm, setCostPerKm] = useState(0.25);

  function resetToToday() {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }

  async function loadCalendarData() {
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
      console.error("Failed to load calendar data:", error);
      setSavedClubs([]);
    }
  }

  function resetForm() {
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

  useEffect(() => {
    async function init() {
      resetToToday();
      await loadCalendarData();
      setMounted(true);
    }

    init();
  }, []);

  useEffect(() => {
    async function refreshCalendarData() {
      if (pathname === "/calendar") {
        resetToToday();
        await loadCalendarData();
      }
    }

    refreshCalendarData();
  }, [pathname]);

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
      return;
    }
    setCurrentMonth((prev) => prev - 1);
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
      return;
    }
    setCurrentMonth((prev) => prev + 1);
  }

  if (!mounted) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 md:p-6">
        <h2 className="text-lg md:text-2xl font-semibold">
          Loading calendar...
        </h2>
      </div>
    );
  }

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const monthName = firstDayOfMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarCells = [];

  for (let i = 0; i < startDay; i++) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  function getFullDate(day) {
    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    return `${currentYear}-${formattedMonth}-${formattedDay}`;
  }

  function getGigsForDay(day) {
    const fullDate = getFullDate(day);
    return gigs.filter((gig) => gig.eventDate === fullDate);
  }

  function getDayClasses(gigsForDay) {
    if (!gigsForDay.length) {
      return "bg-zinc-950 border-zinc-800";
    }

    if (gigsForDay.some((gig) => gig.status === "Canceled")) {
      return "bg-red-600/25 border-red-500/40";
    }

    if (gigsForDay.some((gig) => gig.status === "Played")) {
      return "bg-green-600/25 border-green-500/40";
    }

    return "bg-purple-600/25 border-purple-500/40";
  }

  function makeShortVenueLabel(venueName) {
    if (!venueName) return "GIG";
    const cleaned = venueName.trim();
    if (cleaned.length <= 4) return cleaned.toUpperCase();
    return cleaned.slice(0, 4).toUpperCase();
  }

  function getVenuePreview(gigsForDay) {
    if (!gigsForDay.length) return "";
    const firstVenue = makeShortVenueLabel(gigsForDay[0].venue);
    if (gigsForDay.length === 1) return firstVenue;
    return `${firstVenue}+${gigsForDay.length - 1}`;
  }

  function isToday(day) {
    const today = new Date();

    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  }

  function openDayModal(day) {
    const fullDate = getFullDate(day);
    const gigsForDay = getGigsForDay(day);

    setSelectedDate(fullDate);
    setSelectedDayGigs(gigsForDay);
    setEditingGigId(null);
    setIsAddingGig(false);
    resetForm();

    if (!gigsForDay.length) {
      setIsAddingGig(true);
      setEventDate(fullDate);
    }
  }

  function closeModal() {
    setSelectedDate("");
    setSelectedDayGigs([]);
    setEditingGigId(null);
    setIsAddingGig(false);
    resetForm();
  }

  function applySavedClub(clubId) {
    setSelectedClubId(clubId);

    const club = savedClubs.find((item) => String(item.id) === String(clubId));
    if (!club) return;

    setVenue(club.club_name || "");
    setCity(club.city || "");
    setDistance(String(club.distance ?? ""));
    setFee(String(club.default_fee ?? ""));
  }

  function startEditGig(gig) {
    setIsAddingGig(false);
    setEditingGigId(gig.id);
    setInputMode("new");
    setSelectedClubId("");
    setEventDate(gig.eventDate || "");
    setVenue(gig.venue || "");
    setCity(gig.city || "");
    setDistance(String(gig.distance ?? ""));
    setFee(String(gig.fee ?? ""));
    setStatus(gig.status || "Planned");
    setNotes(gig.notes || "");
  }

  function startAddGigOnSelectedDate() {
    setEditingGigId(null);
    setIsAddingGig(true);
    resetForm();
    setEventDate(selectedDate);
  }

  function cancelFormMode() {
    setEditingGigId(null);
    setIsAddingGig(false);
    resetForm();
  }

  async function saveGigEdit(e) {
    e.preventDefault();

    try {
      const distanceNumber = Number(distance);
      const feeNumber = Number(fee);
      const travelCost = distanceNumber * costPerKm;
      const netProfit = feeNumber - travelCost;

      const updatedGig = await updateGig(editingGigId, {
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

      if (eventDate !== selectedDate) {
        closeModal();
        return;
      }

      const refreshedSelectedDayGigs = updatedGigs.filter(
        (gig) => gig.eventDate === selectedDate
      );

      setSelectedDayGigs(refreshedSelectedDayGigs);
      setEditingGigId(null);
      resetForm();
    } catch (error) {
      console.error("Failed to update gig:", error);
      alert("Update failed.");
    }
  }

  async function addGig(e) {
    e.preventDefault();

    try {
      const distanceNumber = Number(distance);
      const feeNumber = Number(fee);
      const travelCost = distanceNumber * costPerKm;
      const netProfit = feeNumber - travelCost;

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

      const refreshedSelectedDayGigs = updatedGigs.filter(
        (gig) => gig.eventDate === eventDate
      );

      setSelectedDate(eventDate);
      setSelectedDayGigs(refreshedSelectedDayGigs);
      setIsAddingGig(false);
      resetForm();
    } catch (error) {
      console.error("Failed to add gig:", error);
      alert("Creating gig failed.");
    }
  }

  async function deleteGig(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this gig?"
    );
    if (!confirmed) return;

    try {
      await deleteGigById(id);

      const updatedGigs = gigs.filter((gig) => gig.id !== id);
      setGigs(updatedGigs);

      const refreshedSelectedDayGigs = updatedGigs.filter(
        (gig) => gig.eventDate === selectedDate
      );

      if (refreshedSelectedDayGigs.length === 0) {
        setSelectedDayGigs([]);
        setEditingGigId(null);
        setIsAddingGig(true);
        resetForm();
        setEventDate(selectedDate);
        return;
      }

      setSelectedDayGigs(refreshedSelectedDayGigs);
    } catch (error) {
      console.error("Failed to delete gig:", error);
      alert("Delete failed.");
    }
  }

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 md:p-6">
        <div className="flex items-center justify-between mb-3 md:mb-6 gap-3">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="shrink-0 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm hover:bg-zinc-800 transition"
          >
            ←
          </button>

          <h2 className="text-lg md:text-2xl font-semibold text-center">
            {monthName}
          </h2>

          <button
            type="button"
            onClick={goToNextMonth}
            className="shrink-0 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm hover:bg-zinc-800 transition"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[9px] text-zinc-500 md:gap-2 md:mb-3 md:text-sm">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {calendarCells.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={index}
                  className="aspect-square rounded-md md:rounded-lg bg-zinc-950 border border-zinc-900"
                />
              );
            }

            const gigsForDay = getGigsForDay(day);
            const hasGigs = gigsForDay.length > 0;
            const venuePreview = getVenuePreview(gigsForDay);

            return (
              <button
                key={index}
                type="button"
                onClick={() => openDayModal(day)}
                className={`aspect-square rounded-md md:rounded-lg border p-1 overflow-hidden text-left ${getDayClasses(
                  gigsForDay
                )}`}
                title={
                  hasGigs ? gigsForDay.map((gig) => gig.venue).join(", ") : "Add gig"
                }
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between">
                    <div className="text-[10px] md:text-xs font-semibold leading-none">
                      {day}
                    </div>

                    {isToday(day) && (
                      <div className="w-2 h-2 rounded-full bg-zinc-300 shrink-0" />
                    )}
                  </div>

                  {hasGigs && (
                    <div className="mt-1 text-[8px] md:text-[10px] font-semibold leading-tight truncate text-white">
                      {venuePreview}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3 md:p-6">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-semibold">
                  {selectedDayGigs.length > 0 ? "Booked day" : "Add gig"}
                </h3>
                <p className="text-zinc-400 text-sm md:text-base">{selectedDate}</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="bg-zinc-800 hover:bg-zinc-700 transition rounded-lg px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            {editingGigId || isAddingGig ? (
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
                handleSubmit={editingGigId ? saveGigEdit : addGig}
                resetForm={resetForm}
                embedded={true}
                title={editingGigId ? "Edit gig" : "Add gig"}
                submitLabel={editingGigId ? "Save changes" : "Add gig"}
                cancelLabel="Cancel"
                onCancel={cancelFormMode}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={startAddGigOnSelectedDate}
                    className="bg-purple-600 hover:bg-purple-500 transition rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    Add gig on this day
                  </button>
                </div>

                {selectedDayGigs.map((gig) => (
                  <div
                    key={gig.id}
                    className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h4 className="text-lg font-semibold">{gig.venue}</h4>
                        <p className="text-zinc-400">{gig.city}</p>
                      </div>

                      <div className="text-sm px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">
                        {gig.status}
                      </div>
                    </div>

                    <div className="text-sm text-zinc-300 space-y-1 mb-4">
                      <p>Date: {gig.eventDate}</p>
                      <p>Distance: {gig.distance} km</p>
                      <p>Fee: {gig.fee} €</p>
                      <p>Travel Cost: {Number(gig.travelCost || 0).toFixed(2)} €</p>
                      <p>Net Profit: {Number(gig.netProfit || 0).toFixed(2)} €</p>
                      {gig.notes && <p>Notes: {gig.notes}</p>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditGig(gig)}
                        className="bg-blue-600 hover:bg-blue-500 transition rounded-lg px-4 py-2 text-sm font-medium"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteGig(gig.id)}
                        className="bg-red-600 hover:bg-red-500 transition rounded-lg px-4 py-2 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}