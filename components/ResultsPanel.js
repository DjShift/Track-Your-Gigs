export default function ResultsPanel({
  totalGigs,
  totalFee,
  totalTravelCost,
  totalNetProfit,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-sm text-zinc-400 mb-2">Total Gigs</p>
        <p className="text-3xl font-bold">{totalGigs}</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
       <p className="text-sm text-zinc-400 mb-2">Planned Gross Income</p>
        <p className="text-3xl font-bold">€{totalFee.toFixed(2)}</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-sm text-zinc-400 mb-2">Travel Cost</p>
        <p className="text-3xl font-bold">€{totalTravelCost.toFixed(2)}</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-sm text-zinc-400 mb-2">Net Profit</p>
        <p className="text-3xl font-bold">€{totalNetProfit.toFixed(2)}</p>
      </div>
    </div>
  );
}