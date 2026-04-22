"use client";

import { useEffect, useMemo, useState } from "react";

function calculateDurationHours(startTime, endTime) {
  if (!startTime || !endTime) return 6;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return 6;
  }

  const startTotalMinutes = startHour * 60 + startMinute;
  let endTotalMinutes = endHour * 60 + endMinute;

  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  const durationMinutes = endTotalMinutes - startTotalMinutes;
  const durationHours = Math.round((durationMinutes / 60) * 100) / 100;

  return durationHours > 0 ? durationHours : 6;
}

export default function GigForm({
  gig,
  selectedDate,
  savedClubs = [],
  costPerKm = 0.25,
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    eventDate: "",
    venue: "",
    city: "",
    distance: "",
    fee: "",
    status: "Planned",
    notes: "",
    startTime: "22:00",
    endTime: "04:00",
    durationHours: 6,
    extraCosts: 0,
    extraCostsNote: "",
    syncToGoogleCalendar: false,
    calendarReminderEnabled: false,
    calendarReminderMinutes: 30,
  });

  const [clubMode, setClubMode] = useState("saved");

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  useEffect(() => {
    if (gig) {
      const hasGoogleEvent =
        Boolean(gig.googleEventId) || Boolean(gig.google_event_id);

      setFormData({
        eventDate: gig.eventDate || gig.event_date || "",
        venue: gig.venue || "",
        city: gig.city || "",
        distance: gig.distance ?? "",
        fee: gig.fee ?? "",
        status: gig.status || "Planned",
        notes: gig.notes || "",
        startTime: gig.startTime || gig.start_time || "22:00",
        endTime: gig.endTime || gig.end_time || "04:00",
        durationHours: gig.durationHours ?? gig.duration_hours ?? 6,
        extraCosts: gig.extraCosts ?? gig.extra_costs ?? 0,
        extraCostsNote: gig.extraCostsNote ?? gig.extra_costs_note ?? "",
        syncToGoogleCalendar:
          gig.syncToGoogleCalendar ??
          gig.sync_to_google_calendar ??
          hasGoogleEvent,
        calendarReminderEnabled:
          gig.calendarReminderEnabled ??
          gig.calendar_reminder_enabled ??
          false,
        calendarReminderMinutes:
          gig.calendarReminderMinutes ??
          gig.calendar_reminder_minutes ??
          30,
      });

      const matchedClub = savedClubs.find(
        (club) => club.clubName === gig.venue || club.club_name === gig.venue
      );

      setClubMode(matchedClub ? "saved" : "custom");
      return;
    }

    setFormData({
      eventDate: selectedDate || "",
      venue: "",
      city: "",
      distance: "",
      fee: "",
      status: "Planned",
      notes: "",
      startTime: "22:00",
      endTime: "04:00",
      durationHours: 6,
      extraCosts: 0,
      extraCostsNote: "",
      syncToGoogleCalendar: false,
      calendarReminderEnabled: false,
      calendarReminderMinutes: 30,
    });

    setClubMode("saved");
  }, [gig, selectedDate, savedClubs]);

  const normalizedSavedClubs = useMemo(() => {
    return savedClubs.map((club) => ({
      clubName: club.clubName || club.club_name || "",
      city: club.city || "",
      distance: club.distance ?? "",
      defaultFee: club.defaultFee ?? club.default_fee ?? "",
    }));
  }, [savedClubs]);

  useEffect(() => {
    const duration = calculateDurationHours(
      formData.startTime,
      formData.endTime
    );

    setFormData((prev) => ({
      ...prev,
      durationHours: duration,
    }));
  }, [formData.startTime, formData.endTime]);

  useEffect(() => {
    if (!formData.syncToGoogleCalendar && formData.calendarReminderEnabled) {
      setFormData((prev) => ({
        ...prev,
        calendarReminderEnabled: false,
      }));
    }
  }, [formData.syncToGoogleCalendar, formData.calendarReminderEnabled]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleClubSelect(e) {
    const selectedClubName = e.target.value;

    if (!selectedClubName) {
      setFormData((prev) => ({
        ...prev,
        venue: "",
        city: "",
        distance: "",
        fee: "",
      }));
      return;
    }

    const selectedClub = normalizedSavedClubs.find(
      (club) => club.clubName === selectedClubName
    );

    if (!selectedClub) return;

    setFormData((prev) => ({
      ...prev,
      venue: selectedClub.clubName,
      city: selectedClub.city || "",
      distance: selectedClub.distance ?? "",
      fee: selectedClub.defaultFee ?? "",
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      ...gig,
      eventDate: formData.eventDate,
      venue: formData.venue,
      city: formData.city,
      distance: Number(formData.distance || 0),
      fee: Number(formData.fee || 0),
      status: formData.status,
      notes: formData.notes,
      startTime: formData.startTime,
      endTime: formData.endTime,
      durationHours: Number(formData.durationHours || 6),
      extraCosts: Number(formData.extraCosts || 0),
      extraCostsNote: formData.extraCostsNote || "",
      syncToGoogleCalendar: Boolean(formData.syncToGoogleCalendar),
      calendarReminderEnabled:
        Boolean(formData.syncToGoogleCalendar) &&
        Boolean(formData.calendarReminderEnabled),
      calendarReminderMinutes: Number(formData.calendarReminderMinutes || 30),
    };

    onSave(payload);
  }

  const estimatedTravelCost =
    Number(formData.distance || 0) * 2 * Number(costPerKm || 0.25);

  const estimatedExtraCosts = Number(formData.extraCosts || 0);
  const estimatedTotalCosts = estimatedTravelCost + estimatedExtraCosts;
  const estimatedNetProfit = Number(formData.fee || 0) - estimatedTotalCosts;

  const inputClass =
    "w-full min-w-0 max-w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 sm:px-4 py-3 text-white text-sm sm:text-base appearance-none";

  const boxClass = "rounded-2xl bg-zinc-950 border border-zinc-800 p-4";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-zinc-800 flex items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-semibold">
            {gig ? "Edit Gig" : "Add Gig"}
          </h2>

          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Club Source
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClubMode("saved")}
                  className={`rounded-xl px-4 py-2 text-sm border transition ${
                    clubMode === "saved"
                      ? "bg-purple-600 border-purple-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300"
                  }`}
                >
                  Saved Club
                </button>

                <button
                  type="button"
                  onClick={() => setClubMode("custom")}
                  className={`rounded-xl px-4 py-2 text-sm border transition ${
                    clubMode === "custom"
                      ? "bg-purple-600 border-purple-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300"
                  }`}
                >
                  New Venue
                </button>
              </div>
            </div>

            {clubMode === "saved" && (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Saved Club
                </label>

                <select
                  value={formData.venue}
                  onChange={handleClubSelect}
                  className={inputClass}
                >
                  <option value="">Select a club</option>
                  {normalizedSavedClubs.map((club) => (
                    <option key={club.clubName} value={club.clubName}>
                      {club.clubName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  Event Date
                </label>

                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  Venue
                </label>

                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  required
                  disabled={clubMode === "saved"}
                  className={`${inputClass} disabled:opacity-60`}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">City</label>

                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  Distance
                </label>

                <input
                  type="number"
                  name="distance"
                  value={formData.distance}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="km one way"
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  Fee (€)
                </label>

                <input
                  type="number"
                  name="fee"
                  value={formData.fee}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="Planned">Planned</option>
                  <option value="Played">Played</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  Start Time
                </label>

                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  End Time
                </label>

                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  Extra Costs
                </label>

                <input
                  type="number"
                  name="extraCosts"
                  value={formData.extraCosts}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="€"
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm text-zinc-400 mb-2">
                  Extra Note
                </label>

                <input
                  type="text"
                  name="extraCostsNote"
                  value={formData.extraCostsNote}
                  onChange={handleChange}
                  placeholder="parking, hotel..."
                  className={inputClass}
                />
              </div>
            </div>

            <div className={boxClass}>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 rounded-2xl bg-black border border-zinc-800 p-3 sm:p-4 text-xs sm:text-sm text-zinc-200 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    name="syncToGoogleCalendar"
                    checked={formData.syncToGoogleCalendar}
                    onChange={handleChange}
                    className="h-5 w-5 shrink-0 rounded border-zinc-700 bg-zinc-950"
                  />
                  <span className="leading-snug">Sync to Google Calendar</span>
                </label>

                {formData.syncToGoogleCalendar ? (
                  <label className="flex items-center gap-3 rounded-2xl bg-black border border-zinc-800 p-3 sm:p-4 text-xs sm:text-sm text-zinc-200 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      name="calendarReminderEnabled"
                      checked={formData.calendarReminderEnabled}
                      onChange={handleChange}
                      className="h-5 w-5 shrink-0 rounded border-zinc-700 bg-zinc-950"
                    />
                    <span className="leading-snug">Add Calendar reminder</span>
                  </label>
                ) : (
                  <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40" />
                )}
              </div>

              {formData.syncToGoogleCalendar &&
                formData.calendarReminderEnabled && (
                  <div className="mt-3">
                    <label className="block text-sm text-zinc-400 mb-2">
                      Reminder before event
                    </label>

                    <select
                      name="calendarReminderMinutes"
                      value={formData.calendarReminderMinutes}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="10">10 min</option>
                      <option value="30">30 min</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                )}
            </div>

            <div className={boxClass}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-zinc-400 mb-1">Duration</p>
                  <p className="font-semibold text-white">
                    {formData.durationHours} h
                  </p>
                </div>

                <div>
                  <p className="text-zinc-400 mb-1">Travel Cost</p>
                  <p className="font-semibold text-white">
                    €{estimatedTravelCost.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-400 mb-1">Extra Costs</p>
                  <p className="font-semibold text-white">
                    €{estimatedExtraCosts.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-400 mb-1">Net Profit</p>
                  <p className="font-semibold text-white">
                    €{estimatedNetProfit.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-3 text-sm text-zinc-400">
                Total Costs:{" "}
                <span className="text-white font-semibold">
                  €{estimatedTotalCosts.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Notes</label>

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className={inputClass}
              />
            </div>
          </div>

          <div className="border-t border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4 sticky bottom-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-5 py-3 text-white font-medium hover:bg-purple-500 transition"
              >
                Save Gig
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-zinc-700 px-5 py-3 text-zinc-200 font-medium hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}