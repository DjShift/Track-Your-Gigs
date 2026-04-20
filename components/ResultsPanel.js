"use client";

function formatCurrency(value) {
  return `€${(Number(value) || 0).toFixed(2)}`;
}

function VenueNetProfitChart({ gigs = [], costPerKm = 0.25 }) {
  const selectedYear = new Date().getFullYear();

  const yearlyPlayedGigs = gigs.filter((gig) => {
    if (!gig.eventDate) return false;

    const gigYear = new Date(gig.eventDate).getFullYear();

    return gigYear === selectedYear && gig.status === "Played";
  });

  const venueStatsMap = yearlyPlayedGigs.reduce((acc, gig) => {
    const venue = gig.venue || "Unknown Venue";

    const fee = Number(gig.fee) || 0;
    const distance = Number(gig.distance) || 0;
    const travelCost = distance * Number(costPerKm || 0);
    const netProfit = fee - travelCost;

    if (!acc[venue]) {
      acc[venue] = {
        venue,
        gigsCount: 0,
        netProfit: 0,
      };
    }

    acc[venue].gigsCount += 1;
    acc[venue].netProfit += netProfit;

    return acc;
  }, {});

  const chartData = Object.values(venueStatsMap).sort(
    (a, b) => b.netProfit - a.netProfit
  );

  const maxNetProfit = Math.max(
    ...chartData.map((item) => Math.max(item.netProfit, 0)),
    1
  );

  if (chartData.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-sm text-zinc-400 mb-2">
          Best Venues by Net Profit
        </p>

        <p className="text-sm text-zinc-500">
          No played gigs found for {selectedYear}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="mb-5">
        <p className="text-sm text-zinc-400 mb-1">
          Best Venues by Net Profit
        </p>

        <h2 className="text-xl font-bold">
          Played gigs only · {selectedYear}
        </h2>
      </div>

      <div className="overflow-x-auto pb-3">
        <div
          className="flex items-end gap-4 min-h-[260px]"
          style={{
            minWidth: `${Math.max(chartData.length * 90, 420)}px`,
          }}
        >
          {chartData.map((item) => {
            const positiveProfit = Math.max(item.netProfit, 0);

            const barHeight = Math.max(
              (positiveProfit / maxNetProfit) * 180,
              8
            );

            return (
              <div
                key={item.venue}
                className="w-[76px] shrink-0 flex flex-col items-center justify-end"
              >
                <div className="mb-2 text-xs font-bold text-white text-center">
                  {formatCurrency(item.netProfit)}
                </div>

                <div
                  className="w-full bg-emerald-500 rounded-t-xl"
                  style={{ height: `${barHeight}px` }}
                  title={`${item.venue}: ${formatCurrency(item.netProfit)}`}
                />

                <div className="mt-2 w-full text-center">
                  <div
                    className="text-[11px] text-zinc-300 font-medium truncate"
                    title={item.venue}
                  >
                    {item.venue}
                  </div>

                  <div className="text-[10px] text-zinc-500">
                    {item.gigsCount} {item.gigsCount === 1 ? "gig" : "gigs"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPanel({
  totalGigs = 0,
  totalFee = 0,
  totalTravelCost = 0,
  totalNetProfit = 0,
  gigs = [],
  costPerKm = 0.25,
}) {
  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Total Gigs</p>
          <p className="text-3xl font-bold">{totalGigs}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Planned Gross Income</p>
          <p className="text-3xl font-bold">{formatCurrency(totalFee)}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Travel Cost</p>
          <p className="text-3xl font-bold">
            {formatCurrency(totalTravelCost)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Net Profit</p>
          <p className="text-3xl font-bold">
            {formatCurrency(totalNetProfit)}
          </p>
        </div>
      </div>

      <VenueNetProfitChart gigs={gigs} costPerKm={costPerKm} />
    </div>
  );
}