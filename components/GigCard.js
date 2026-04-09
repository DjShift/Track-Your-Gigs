export default function GigCard({
  gig,
  handleStatusChange,
  handleEditGig,
  handleDeleteGig,
}) {
  const travelCost = Number(gig.travelCost || 0);
  const netProfit = Number(gig.netProfit || 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-xl font-semibold">{gig.venue}</h3>
          <p className="text-zinc-400">{gig.city}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <select
            value={gig.status}
            onChange={(e) => handleStatusChange(gig.id, e.target.value)}
            className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white text-sm"
          >
            <option value="Planned">Planned</option>
            <option value="Played">Played</option>
            <option value="Canceled">Canceled</option>
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleEditGig(gig)}
              className="bg-blue-600 hover:bg-blue-500 transition rounded-lg px-3 py-2 text-sm font-medium"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => handleDeleteGig(gig.id)}
              className="bg-red-600 hover:bg-red-500 transition rounded-lg px-3 py-2 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-zinc-300 space-y-1">
        <p>Date: {gig.eventDate}</p>
        <p>Distance: {gig.distance} km</p>
        <p>Fee: {gig.fee} €</p>
        <p>Travel Cost: {travelCost.toFixed(2)} €</p>
        <p>Net Profit: {netProfit.toFixed(2)} €</p>

        {gig.notes && (
          <div className="pt-2">
            <p className="text-zinc-400">Notes:</p>
            <p className="whitespace-pre-wrap">{gig.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}