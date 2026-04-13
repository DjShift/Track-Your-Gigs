"use client";

import { useEffect, useMemo, useState } from "react";

function calculateDurationHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return 0;
  }

  const startTotalMinutes = startHour * 60 + startMinute;
  let endTotalMinutes = endHour * 60 + endMinute;

  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  const durationMinutes = endTotalMinutes - startTotalMinutes;
  return Math.round((durationMinutes / 60) * 100) / 100;
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
      setFormData({
        eventDate: gig.eventDate || "",
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

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
      durationHours: Number(formData.durationHours || 0),
      extraCosts: Number(formData.extraCosts || 0),
      extraCostsNote: formData.extraCostsNote || "",
    };

    onSave(payload);
  }

  const estimatedTravelCost =
    Number(formData.distance || 0) * 2 * Number(costPerKm || 0.25);

  const estimatedExtraCosts = Number(formData.extraCosts || 0);
  const estimatedTotalCosts = estimatedTravelCost + estimatedExtraCosts;
  const estimatedNetProfit = Number(formData.fee || 0) - estimatedTotalCosts;

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
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
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
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Event Date
                </label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                />
              </div>

              <div>
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
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Distance (km)
                </label>
                <input
                  type="number"
                  name="distance"
                  value={formData.distance}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                />
              </div>

              <div>
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
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                >
                  <option value="Planned">Planned</option>
                  <option value="Played">Played</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Extra Costs (€)
                </label>
                <input
                  type="number"
                  name="extraCosts"
                  value={formData.extraCosts}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Extra Costs Note
                </label>
                <input
                  type="text"
                  name="extraCostsNote"
                  value={formData.extraCostsNote}
                  onChange={handleChange}
                  placeholder="e.g. parking, hotel..."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
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
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-white"
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