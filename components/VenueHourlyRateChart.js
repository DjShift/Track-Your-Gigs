"use client";

const PLAYING_HOURS = 4;
const BUFFER_HOURS = 1;
const AVERAGE_SPEED_KMH = 60;

function formatCurrency(value) {
  return `€${Math.round(Number(value) || 0)}`;
}

function formatHourlyRate(value) {
  return `€${Number(value || 0).toFixed(1)}/h`;
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

function getGigEstimatedHours(gig) {
  const distance = Number(gig.distance || 0);
  const travelHours = distance / AVERAGE_SPEED_KMH;

  return PLAYING_HOURS + BUFFER_HOURS + travelHours;
}

function buildVenueHourlyStats(gigs, selectedYear, costPerKm) {
  const venueStatsMap = gigs.reduce((acc, gig) => {
    if (!gig.eventDate) return acc;
    if (gig.status !== "Played") return acc;

    const gigYear = new Date(gig.eventDate).getFullYear();

    if (gigYear !== selectedYear) return acc;

    const venue = gig.venue || "Unknown Club";
    const netProfit = getGigNetProfit(gig, costPerKm);
    const estimatedHours = getGigEstimatedHours(gig);

    if (!acc[venue]) {
      acc[venue] = {
        venue,
        gigsCount: 0,
        netProfit: 0,
        estimatedHours: 0,
        hourlyRate: 0,
      };
    }

    acc[venue].gigsCount += 1;
    acc[venue].netProfit += netProfit;
    acc[venue].estimatedHours += estimatedHours;

    return acc;
  }, {});

  return Object.values(venueStatsMap)
    .map((item) => ({
      ...item,
      hourlyRate:
        item.estimatedHours > 0 ? item.netProfit / item.estimatedHours : 0,
    }))
    .sort((a, b) => b.hourlyRate - a.hourlyRate);
}

export default function VenueHourlyRateChart({
  gigs = [],
  selectedYear = new Date().getFullYear(),
  costPerKm = 0.25,
}) {
  const chartData = buildVenueHourlyStats(gigs, selectedYear, costPerKm);

  const maxHourlyRate = Math.max(
    ...chartData.map((item) => Math.max(item.hourlyRate, 0)),
    1
  );

  if (chartData.length === 0) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-2">
          Hourly Net Rate by Club
        </h2>

        <p className="text-sm text-zinc-400 mb-4">Year: {selectedYear}</p>

        <p className="text-zinc-500">No played gigs found for this year.</p>
      </section>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-2">
        Hourly Net Rate by Club
      </h2>

      <p className="text-sm text-zinc-400 mb-4">
        Year: {selectedYear} · Net profit / estimated time · 4h playing + 1h
        buffer + 60 km/h travel speed
      </p>

      <div className="overflow-x-auto">
        <div
          className="flex items-end gap-7 min-h-[300px]"
          style={{
            minWidth: `${Math.max(chartData.length * 110, 900)}px`,
          }}
        >
          {chartData.map((item) => {
            const positiveRate = Math.max(item.hourlyRate, 0);

            const barHeight = Math.max(
              (positiveRate / maxHourlyRate) * 220,
              10
            );

            return (
              <div
                key={item.venue}
                className="w-[80px] shrink-0 flex flex-col items-center justify-end"
              >
                <div className="mb-3 text-lg font-semibold text-white">
                  {formatHourlyRate(item.hourlyRate)}
                </div>

                <div
                  className="w-full rounded-xl bg-purple-500"
                  style={{ height: `${barHeight}px` }}
                  title={`${item.venue}: ${formatHourlyRate(
                    item.hourlyRate
                  )}`}
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
                    {formatCurrency(item.netProfit)}
                  </div>

                  <div className="text-[11px] text-zinc-600 mt-1">
                    {item.estimatedHours.toFixed(1)} h
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