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

function formatTotalHours(gigsForDay) {
  const total = gigsForDay.reduce((sum, gig) => {
    const hours = Number(gig.durationHours ?? gig.duration_hours ?? 0);
    return sum + (Number.isFinite(hours) ? hours : 0);
  }, 0);

  if (!total) return "";

  if (Number.isInteger(total)) {
    return `${total}h`;
  }

  return `${total.toFixed(1)}h`;
}

export default function CalendarGrid({ gigs = [], setGigs }) {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(0);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDayGigs, setSelectedDayGigs] = useState([]);
  const [editingGig, setEditingGig] = useState(null);
  const [isAddingGig, setIsAddingGig] = useState(false);

  const [savedClubs, setSavedClubs] = useState([]);
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
      setGigs(gigsData || []);
      setCostPerKm(cost);
    } catch (error) {
      console.error("Failed to load calendar data:", error);
      setSavedClubs([]);
    }
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

  function getGigDate(gig) {
    return gig.eventDate || gig.event_date || "";
  }

  function getGoogleEventId(gig) {
    return gig?.googleEventId || gig?.google_event_id || "";
  }

  async function checkGoogleCalendarStatus() {
    const response = await fetch("/api/google-calendar/status", {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        connected: false,
        error: data?.error || "Failed to check Google Calendar status.",
      };
    }

    return {
      connected: Boolean(data?.connected),
      error: data?.error || "",
    };
  }

  async function createGoogleCalendarEvent(gigData) {
    const response = await fetch("/api/google-calendar/create-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventDate: gigData.eventDate,
        venue: gigData.venue,
        city: gigData.city,
        notes: gigData.notes || "",
        startTime: gigData.startTime || "22:00",
        endTime: gigData.endTime || "04:00",
        status: gigData.status || "Planned",
        calendarReminderEnabled: Boolean(gigData.calendarReminderEnabled),
        calendarReminderMinutes: Number(gigData.calendarReminderMinutes || 30),
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Google Calendar create failed.");
    }

    return data;
  }

  async function updateGoogleCalendarEvent(gigData, googleEventId) {
    const response = await fetch("/api/google-calendar/update-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        googleEventId,
        eventDate: gigData.eventDate,
        venue: gigData.venue,
        city: gigData.city,
        notes: gigData.notes || "",
        startTime: gigData.startTime || "22:00",
        endTime: gigData.endTime || "04:00",
        status: gigData.status || "Planned",
        calendarReminderEnabled: Boolean(gigData.calendarReminderEnabled),
        calendarReminderMinutes: Number(gigData.calendarReminderMinutes || 30),
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Google Calendar update failed.");
    }

    return data;
  }

  async function deleteGoogleCalendarEvent(googleEventId) {
    const response = await fetch("/api/google-calendar/delete-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        googleEventId,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Google Calendar delete failed.");
    }

    return data;
  }

  if (!mounted) {
    return (
      <div className="app-panel border border-zinc-800 rounded-2xl p-3 md:p-6">
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

  for (let i = 0; i < startDay; i += 1) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(day);
  }

  function getFullDate(day) {
    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    return `${currentYear}-${formattedMonth}-${formattedDay}`;
  }

  function getGigsForDay(day) {
    const fullDate = getFullDate(day);
    return gigs.filter((gig) => getGigDate(gig) === fullDate);
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
    setEditingGig(null);
    setIsAddingGig(false);

    if (!gigsForDay.length) {
      setIsAddingGig(true);
    }
  }

  function closeModal() {
    setSelectedDate("");
    setSelectedDayGigs([]);
    setEditingGig(null);
    setIsAddingGig(false);
  }

  function startEditGig(gig) {
    setIsAddingGig(false);
    setEditingGig(gig);
  }

  function startAddGigOnSelectedDate() {
    setEditingGig(null);
    setIsAddingGig(true);
  }

  function cancelFormMode() {
    setEditingGig(null);
    setIsAddingGig(false);

    if (!selectedDayGigs.length) {
      closeModal();
    }
  }

  async function handleSaveGig(gigData) {
    try {
      const oneWayDistance = Number(gigData.distance || 0);
      const roundTripDistance = oneWayDistance * 2;
      const travelCost = roundTripDistance * costPerKm;
      const extraCosts = Number(gigData.extraCosts || 0);
      const totalCosts = travelCost + extraCosts;
      const netProfit = Number(gigData.fee || 0) - totalCosts;

      const wantsCalendarSync = Boolean(gigData.syncToGoogleCalendar);
      const wantsCalendarReminder =
        wantsCalendarSync && Boolean(gigData.calendarReminderEnabled);

      const calendarGigData = {
        ...gigData,
        calendarReminderEnabled: wantsCalendarReminder,
      };

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
        calendar_reminder_enabled: wantsCalendarReminder,
        calendar_reminder_minutes: Number(gigData.calendarReminderMinutes || 30),
      };

      if (editingGig?.id) {
        const existingGoogleEventId = getGoogleEventId(editingGig);

        let finalGig = await updateGig(editingGig.id, payload);

        if (wantsCalendarSync) {
          const calendarStatus = await checkGoogleCalendarStatus();

          if (!calendarStatus.connected) {
            alert(
              "Gig saved. Connect Google Calendar in Settings to enable sync."
            );
          } else {
            try {
              if (existingGoogleEventId) {
                await updateGoogleCalendarEvent(
                  calendarGigData,
                  existingGoogleEventId
                );

                finalGig = await updateGig(editingGig.id, {
                  google_event_id: existingGoogleEventId,
                });
              } else {
                const googleResult =
                  await createGoogleCalendarEvent(calendarGigData);

                if (googleResult?.eventId) {
                  finalGig = await updateGig(editingGig.id, {
                    google_event_id: googleResult.eventId,
                  });
                }
              }
            } catch (googleError) {
              console.error("Google Calendar edit sync failed:", googleError);
              alert("Gig was saved, but Google Calendar sync failed.");
            }
          }
        }

        const updatedGigs = gigs.map((gig) =>
          gig.id === editingGig.id ? finalGig : gig
        );

        setGigs(updatedGigs);

        const refreshedSelectedDayGigs = updatedGigs.filter(
          (gig) => getGigDate(gig) === selectedDate
        );

        if (gigData.eventDate !== selectedDate) {
          closeModal();
          return;
        }

        setSelectedDayGigs(refreshedSelectedDayGigs);
        setEditingGig(null);
        return;
      }

      let newGig = await createGig(payload);

      if (wantsCalendarSync) {
        const calendarStatus = await checkGoogleCalendarStatus();

        if (!calendarStatus.connected) {
          alert(
            "Gig saved. Connect Google Calendar in Settings to enable sync."
          );
        } else {
          try {
            const googleResult =
              await createGoogleCalendarEvent(calendarGigData);

            if (googleResult?.eventId) {
              newGig = await updateGig(newGig.id, {
                google_event_id: googleResult.eventId,
              });
            }
          } catch (googleError) {
            console.error("Google Calendar create sync failed:", googleError);
            alert("Gig was saved, but Google Calendar sync failed.");
          }
        }
      }

      const updatedGigs = [newGig, ...gigs];
      setGigs(updatedGigs);

      const refreshedSelectedDayGigs = updatedGigs.filter(
        (gig) => getGigDate(gig) === gigData.eventDate
      );

      setSelectedDate(gigData.eventDate);
      setSelectedDayGigs(refreshedSelectedDayGigs);
      setIsAddingGig(false);
    } catch (error) {
      console.error("Failed to save gig:", error);
      alert("Saving gig failed.");
    }
  }

  async function deleteGig(gigOrId) {
    const gig =
      typeof gigOrId === "object"
        ? gigOrId
        : gigs.find((item) => item.id === gigOrId);

    if (!gig) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this gig?"
    );

    if (!confirmed) return;

    let googleDeleteFailed = false;

    try {
      const googleEventId = getGoogleEventId(gig);

      if (googleEventId) {
        try {
          await deleteGoogleCalendarEvent(googleEventId);
        } catch (googleError) {
          console.error("Google Calendar delete sync failed:", googleError);
          googleDeleteFailed = true;
        }
      }

      await deleteGigById(gig.id);

      const updatedGigs = gigs.filter((item) => item.id !== gig.id);
      setGigs(updatedGigs);

      const refreshedSelectedDayGigs = updatedGigs.filter(
        (item) => getGigDate(item) === selectedDate
      );

      if (editingGig?.id === gig.id) {
        setEditingGig(null);
      }

      if (refreshedSelectedDayGigs.length === 0) {
        setSelectedDayGigs([]);
        setEditingGig(null);
        setIsAddingGig(true);
      } else {
        setSelectedDayGigs(refreshedSelectedDayGigs);
      }

      if (googleDeleteFailed) {
        alert("Gig was deleted, but Google Calendar event could not be removed.");
      }
    } catch (error) {
      console.error("Failed to delete gig:", error);
      alert("Delete failed.");
    }
  }

  return (
    <>
      <div className="app-panel border border-zinc-800 rounded-2xl p-3 md:p-6">
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
            const totalHours = formatTotalHours(gigsForDay);

            return (
              <button
                key={index}
                type="button"
                onClick={() => openDayModal(day)}
                className={`aspect-square rounded-md md:rounded-lg border p-1 overflow-hidden text-left ${getDayClasses(
                  gigsForDay
                )}`}
                title={
                  hasGigs
                    ? gigsForDay.map((gig) => gig.venue).join(", ")
                    : "Add gig"
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
                    <>
                      <div className="mt-1 text-[8px] md:text-[10px] font-semibold leading-tight truncate text-white">
                        {venuePreview}
                      </div>

                      {totalHours && (
                        <div className="mt-0.5 text-[8px] md:text-[10px] leading-tight text-zinc-300 truncate">
                          {totalHours}
                        </div>
                      )}
                    </>
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
                <p className="text-zinc-400 text-sm md:text-base">
                  {selectedDate}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="bg-zinc-800 hover:bg-zinc-700 transition rounded-lg px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            {editingGig || isAddingGig ? (
              <GigForm
                gig={editingGig}
                selectedDate={selectedDate}
                savedClubs={savedClubs}
                costPerKm={costPerKm}
                onSave={handleSaveGig}
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

                {selectedDayGigs.map((gig) => {
                  const startTime = gig.startTime || gig.start_time;
                  const endTime = gig.endTime || gig.end_time;
                  const durationHours = gig.durationHours ?? gig.duration_hours;

                  return (
                    <div
                      key={gig.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="text-lg font-semibold">
                            {gig.venue}
                          </h4>
                          <p className="text-zinc-400">{gig.city}</p>
                        </div>

                        <div className="text-sm px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">
                          {gig.status}
                        </div>
                      </div>

                      <div className="text-sm text-zinc-300 space-y-1 mb-4">
                        <p>Date: {getGigDate(gig)}</p>
                        <p>Distance: {gig.distance} km one way</p>
                        <p>Fee: {gig.fee} €</p>
                        <p>
                          Travel by Car:{" "}
                          {Number(
                            gig.travelCost || gig.travel_cost || 0
                          ).toFixed(2)}{" "}
                          €
                        </p>
                        <p>
                          Other Costs:{" "}
                          {Number(
                            gig.extraCosts || gig.extra_costs || 0
                          ).toFixed(2)}{" "}
                          €
                        </p>
                        {gig.extraCostsNote && (
                          <p>Other Costs Note: {gig.extraCostsNote}</p>
                        )}
                        <p>
                          Net Profit:{" "}
                          {Number(
                            gig.netProfit || gig.net_profit || 0
                          ).toFixed(2)}{" "}
                          €
                        </p>
                        {(startTime || endTime) && (
                          <p>
                            Play Time: {startTime || "—"} - {endTime || "—"}
                            {durationHours ? ` • ${durationHours}h` : ""}
                          </p>
                        )}
                        {getGoogleEventId(gig) && (
                          <p className="text-green-400">
                            Synced to Google Calendar
                          </p>
                        )}
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
                          onClick={() => deleteGig(gig)}
                          className="bg-red-600 hover:bg-red-500 transition rounded-lg px-4 py-2 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}