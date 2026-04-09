"use client";

export default function GigForm({
  editingGigId,
  inputMode,
  setInputMode,
  savedClubs,
  selectedClubId,
  setSelectedClubId,
  applySavedClub,
  eventDate,
  setEventDate,
  venue,
  setVenue,
  city,
  setCity,
  distance,
  setDistance,
  fee,
  setFee,
  status,
  setStatus,
  notes,
  setNotes,
  handleSubmit,
  resetForm,
  embedded = false,
  title,
  submitLabel,
  cancelLabel = "Cancel",
  onCancel,
}) {
  const resolvedTitle = title || (editingGigId ? "Edit Gig" : "Add Gig");
  const resolvedSubmitLabel =
    submitLabel || (editingGigId ? "Update Gig" : "Add Gig");

  const wrapperClass = embedded
    ? "space-y-4"
    : "bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 space-y-4";

  return (
    <form onSubmit={handleSubmit} className={wrapperClass}>
      <h2 className={embedded ? "text-lg font-semibold" : "text-2xl font-semibold"}>
        {resolvedTitle}
      </h2>

      {!editingGigId && (
        <div>
          <label className="block mb-2 text-sm text-zinc-300">Input Mode</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setInputMode("saved");
                setSelectedClubId("");
                setVenue("");
                setCity("");
                setDistance("");
                setFee("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                inputMode === "saved"
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300"
              }`}
            >
              Saved Club
            </button>

            <button
              type="button"
              onClick={() => {
                setInputMode("new");
                setSelectedClubId("");
                setVenue("");
                setCity("");
                setDistance("");
                setFee("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                inputMode === "new"
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300"
              }`}
            >
              New Venue
            </button>
          </div>
        </div>
      )}

      {!editingGigId && inputMode === "saved" && (
        <div>
          <label className="block mb-1 text-sm text-zinc-300">Saved Club</label>
          <select
            value={selectedClubId}
            onChange={(e) => {
              setSelectedClubId(e.target.value);
              applySavedClub(e.target.value);
            }}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
            required
          >
            <option value="">Select saved club</option>
            {savedClubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.club_name || "Unnamed Club"} — {club.city}
              </option>
            ))}
          </select>

          {savedClubs.length === 0 && (
            <p className="text-sm text-zinc-500 mt-2">
              No saved clubs yet. Add them in Settings first.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block mb-1 text-sm text-zinc-300">Event Date</label>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
          required
        />
      </div>

      <div>
        <label className="block mb-1 text-sm text-zinc-300">Venue</label>
        <input
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
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
        <label className="block mb-1 text-sm text-zinc-300">Distance (km)</label>
        <input
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
          required
        />
      </div>

      <div>
        <label className="block mb-1 text-sm text-zinc-300">Fee (€)</label>
        <input
          type="number"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
          required
        />
      </div>

      <div>
        <label className="block mb-1 text-sm text-zinc-300">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
        >
          <option value="Planned">Planned</option>
          <option value="Played">Played</option>
          <option value="Canceled">Canceled</option>
        </select>
      </div>

      <div>
        <label className="block mb-1 text-sm text-zinc-300">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white min-h-[100px]"
          placeholder="Add any notes about this gig..."
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-500 transition rounded-lg px-5 py-2 font-medium"
        >
          {resolvedSubmitLabel}
        </button>

        {(editingGigId || onCancel) && (
          <button
            type="button"
            onClick={onCancel || resetForm}
            className="bg-zinc-700 hover:bg-zinc-600 transition rounded-lg px-5 py-2 font-medium"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}