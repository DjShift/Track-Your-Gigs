"use client";

function formatCurrency(value) {
  return `€${Math.round(Number(value) || 0)}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getGigNetProfit(gig, costPerKm = 0.25) {
  const savedNetProfit = gig.netProfit ?? gig.net_profit;

  if (savedNetProfit !== undefined && savedNetProfit !== null) {
    return Number(savedNetProfit) || 0;
  }

  const fee = Number(gig.fee || 0);
  const savedTravelCost = gig.travelCost ?? gig.travel_cost;
  const extraCosts = Number(gig.extraCosts || gig.extra_costs || 0);

  if (savedTravelCost !== undefined && savedTravelCost !== null) {
    return fee - (Number(savedTravelCost) || 0) - extraCosts;
  }

  const distance = Number(gig.distance || 0);
  const fallbackTravelCost = distance * Number(costPerKm || 0);

  return fee - fallbackTravelCost - extraCosts;
}

function buildVenueStats(gigs, selectedYear, costPerKm) {
  const venueStatsMap = gigs.reduce((acc, gig) => {
    if (!gig.eventDate) return acc;
    if (gig.status !== "Played") return acc;

    const gigYear = new Date(gig.eventDate).getFullYear();

    if (gigYear !== selectedYear) return acc;

    const venue = gig.venue || "Unknown Club";
    const netProfit = getGigNetProfit(gig, costPerKm);

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

  return Object.values(venueStatsMap).sort(
    (a, b) => b.netProfit - a.netProfit
  );
}

export default function VenueNetProfitChart({
  gigs = [],
  selectedYear = new Date().getFullYear(),
  costPerKm = 0.25,
}) {
  const chartData = buildVenueStats(gigs, selectedYear, costPerKm);

  const totalNetProfit = chartData.reduce((sum, item) => {
    return sum + item.netProfit;
  }, 0);

  const maxNetProfit = Math.max(
    ...chartData.map((item) => Math.max(item.netProfit, 0)),
    1
  );

  if (chartData.length === 0) {
    return (
      <section className="app-panel border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-2">Net Income by Club</h2>

        <p className="text-sm text-zinc-400 mb-4">Year: {selectedYear}</p>

        <p className="text-zinc-500">No played gigs found for this year.</p>
      </section>
    );
  }

  return (
    <section className="app-panel border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-2">Net Income by Club</h2>

      <p className="text-sm text-zinc-400 mb-4">
        Year: {selectedYear} · Played gigs only · Total net income split by club
      </p>

      <div className="overflow-x-auto">
        <div
          className="flex items-end gap-7 min-h-[300px]"
          style={{
            minWidth: `${Math.max(chartData.length * 110, 900)}px`,
          }}
        >
          {chartData.map((item) => {
            const positiveProfit = Math.max(item.netProfit, 0);

            const barHeight = Math.max(
              (positiveProfit / maxNetProfit) * 220,
              10
            );

            const profitShare =
              totalNetProfit > 0 ? (item.netProfit / totalNetProfit) * 100 : 0;

            return (
              <div
                key={item.venue}
                className="w-[80px] shrink-0 flex flex-col items-center justify-end"
              >
                <div className="mb-3 text-lg font-semibold text-white">
                  {formatCurrency(item.netProfit)}
                </div>

                <div
                  className="w-full rounded-xl bg-purple-500"
                  style={{ height: `${barHeight}px` }}
                  title={`${item.venue}: ${formatCurrency(
                    item.netProfit
                  )} · ${formatPercent(profitShare)}`}
                />

                <div className="mt-4 w-full text-center">
                  <div
                    className="text-base text-zinc-400 font-semibold truncate"
                    title={item.venue}
                  >
                    {item.venue}
                  </div>

                  <div className="text-xs text-zinc-600 mt-1">
                    {item.gigsCount} {item.gigsCount === 1 ? "gig" : "gigs"}
                  </div>

                  <div className="text-xs text-purple-400 font-semibold mt-1">
                    {formatPercent(profitShare)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}