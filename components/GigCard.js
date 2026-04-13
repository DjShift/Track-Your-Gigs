"use client";

function formatDuration(durationHours) {
  const duration = Number(durationHours || 0);

  if (!duration) return null;

  if (Number.isInteger(duration)) {
    return `${duration}h`;
  }

  return `${duration.toFixed(1)}h`;
}

export default function GigCard({ gig, onEdit, onDelete }) {
  const durationLabel = formatDuration(
    gig.durationHours ?? gig.duration_hours
  );

  const startTime = gig.startTime || gig.start_time;
  const endTime = gig.endTime || gig.end_time;

  const fee = Number(gig.fee || 0);
  const travelCost = Number(gig.travelCost || gig.travel_cost || 0);
  const extraCosts = Number(gig.extraCosts || gig.extra_costs || 0);
  const netProfit = Number(gig.netProfit || gig.net_profit || 0);
  const totalCosts = travelCost + extraCosts;
  const extraCostsNote = gig.extraCostsNote || gig.extra_costs_note || "";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{gig.venue}</h3>
          <p className="text-sm text-zinc-400">
            {gig.eventDate} {gig.city ? `• ${gig.city}` : ""}
          </p>
        </div>

        <span
          className={`text-xs px-3 py-1 rounded-full border ${
            gig.status === "Played"
              ? "bg-green-500/10 text-green-300 border-green-500/30"
              : gig.status === "Canceled"
              ? "bg-red-500/10 text-red-300 border-red-500/30"
              : "bg-purple-500/10 text-purple-300 border-purple-500/30"
          }`}
        >
          {gig.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <p className="text-zinc-400 mb-1">Fee</p>
          <p className="font-semibold">€{fee.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <p className="text-zinc-400 mb-1">Travel</p>
          <p className="font-semibold">€{travelCost.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <p className="text-zinc-400 mb-1">Extra</p>
          <p className="font-semibold">€{extraCosts.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <p className="text-zinc-400 mb-1">Net</p>
          <p className="font-semibold">€{netProfit.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <p className="text-zinc-400 mb-1">Distance</p>
          <p className="font-semibold">{Number(gig.distance || 0)} km</p>
        </div>
      </div>

      <div className="text-sm text-zinc-300">
        <span className="text-zinc-400">Total Costs: </span>
        €{totalCosts.toFixed(2)}
      </div>

      {(startTime || endTime || durationLabel) && (
        <div className="text-sm text-zinc-300">
          <span className="text-zinc-400">Play Time: </span>
          {startTime && endTime ? `${startTime} – ${endTime}` : "—"}
          {durationLabel ? ` • ${durationLabel}` : ""}
        </div>
      )}

      {extraCostsNote ? (
        <div className="text-sm text-zinc-300">
          <span className="text-zinc-400">Extra Costs Note: </span>
          {extraCostsNote}
        </div>
      ) : null}

      {gig.notes ? (
        <div className="text-sm text-zinc-400">{gig.notes}</div>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onEdit(gig)}
          className="rounded-xl bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700 transition"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(gig.id)}
          className="rounded-xl bg-red-600/80 px-4 py-2 text-sm text-white hover:bg-red-500 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}