import { useEffect, useMemo, useState } from "react";

export default function MonthlyResults({ gigs }) {
  const monthShortNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthLongNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function getMonthKey(dateString) {
    const date = new Date(dateString);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  }

  const groupedResults = useMemo(() => {
    return gigs.reduce((acc, gig) => {
      if (!gig.eventDate) return acc;

      const date = new Date(gig.eventDate);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const monthKey = getMonthKey(gig.eventDate);

      if (!acc[monthKey]) {
        acc[monthKey] = {
          key: monthKey,
          year,
          monthIndex,
          label: `${monthLongNames[monthIndex]} ${year}`,
          totalGigs: 0,
          plannedGigs: 0,
          playedGigs: 0,
          canceledGigs: 0,
          plannedGrossIncome: 0,
          plannedTravelCost: 0,
          plannedNetIncome: 0,
          actualGrossIncome: 0,
          actualTravelCost: 0,
          actualNetIncome: 0,
        };
      }

      const fee = Number(gig.fee || 0);
      const travelCost = Number(gig.travelCost || 0);
      const netProfit = Number(gig.netProfit || 0);

      acc[monthKey].totalGigs += 1;
      acc[monthKey].plannedGrossIncome += fee;
      acc[monthKey].plannedTravelCost += travelCost;
      acc[monthKey].plannedNetIncome += netProfit;

      if (gig.status === "Planned") {
        acc[monthKey].plannedGigs += 1;
      }

      if (gig.status === "Played") {
        acc[monthKey].playedGigs += 1;
        acc[monthKey].actualGrossIncome += fee;
        acc[monthKey].actualTravelCost += travelCost;
        acc[monthKey].actualNetIncome += netProfit;
      }

      if (gig.status === "Canceled") {
        acc[monthKey].canceledGigs += 1;
      }

      return acc;
    }, {});
  }, [gigs]);

  const availableYears = useMemo(() => {
    const years = [
      ...new Set(Object.values(groupedResults).map((month) => month.year)),
    ];

    return years.sort((a, b) => b - a);
  }, [groupedResults]);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);

  useEffect(() => {
    if (availableYears.length === 0) {
      setSelectedYear(null);
      setSelectedMonthIndex(null);
      return;
    }

    setSelectedYear((currentYear) => {
      if (currentYear && availableYears.includes(currentYear)) {
        return currentYear;
      }

      return availableYears[0];
    });
  }, [availableYears]);

  const monthsInSelectedYear = useMemo(() => {
    if (!selectedYear) return [];

    return Object.values(groupedResults)
      .filter((month) => month.year === selectedYear)
      .sort((a, b) => a.monthIndex - b.monthIndex);
  }, [groupedResults, selectedYear]);

  useEffect(() => {
    if (!selectedYear) {
      setSelectedMonthIndex(null);
      return;
    }

    const availableMonthIndexes = monthsInSelectedYear.map(
      (month) => month.monthIndex
    );

    if (availableMonthIndexes.length === 0) {
      setSelectedMonthIndex(0);
      return;
    }

    setSelectedMonthIndex((currentMonthIndex) => {
      if (
        currentMonthIndex !== null &&
        availableMonthIndexes.includes(currentMonthIndex)
      ) {
        return currentMonthIndex;
      }

      return Math.max(...availableMonthIndexes);
    });
  }, [selectedYear, monthsInSelectedYear]);

  const activeMonthKey =
    selectedYear !== null && selectedMonthIndex !== null
      ? `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`
      : null;

  const selectedMonthData = activeMonthKey
    ? groupedResults[activeMonthKey]
    : null;

  const clubProfitMap = useMemo(() => {
    return gigs.reduce((acc, gig) => {
      if (gig.status !== "Played") return acc;

      const venueName = gig.venue || "Unknown Club";
      const netProfit = Number(gig.netProfit || 0);
      const grossIncome = Number(gig.fee || 0);
      const travelCost = Number(gig.travelCost || 0);

      if (!acc[venueName]) {
        acc[venueName] = {
          venue: venueName,
          playedGigs: 0,
          grossIncome: 0,
          travelCost: 0,
          netIncome: 0,
        };
      }

      acc[venueName].playedGigs += 1;
      acc[venueName].grossIncome += grossIncome;
      acc[venueName].travelCost += travelCost;
      acc[venueName].netIncome += netProfit;

      return acc;
    }, {});
  }, [gigs]);

  const mostProfitableClub = useMemo(() => {
    return Object.values(clubProfitMap).sort(
      (a, b) => b.netIncome - a.netIncome
    )[0];
  }, [clubProfitMap]);

  function getChartData() {
    if (!selectedYear) return [];

    return monthShortNames.map((label, index) => {
      const monthKey = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
      const monthData = groupedResults[monthKey];

      return {
        label,
        value: monthData ? monthData.actualNetIncome : 0,
      };
    });
  }

  function renderActualNetIncomeChart() {
    const chartData = getChartData();
    const maxValue = Math.max(...chartData.map((item) => item.value), 1);
    const chartHeight = 220;
    const barWidth = 44;
    const gap = 16;
    const leftPadding = 20;
    const svgHeight = 280;
    const svgWidth = leftPadding + chartData.length * (barWidth + gap);

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-2">
          Actual Net Income by Month
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          {selectedYear ? `Year: ${selectedYear}` : "No year selected"}
        </p>

        <div className="overflow-x-auto">
          <svg
            width={svgWidth}
            height={svgHeight}
            className="min-w-full"
            role="img"
            aria-label="Actual Net Income by Month"
          >
            {chartData.map((item, index) => {
              const barHeight =
                item.value > 0 ? (item.value / maxValue) * chartHeight : 0;

              const x = leftPadding + index * (barWidth + gap);
              const y = 240 - barHeight;

              return (
                <g key={item.label}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="8"
                    className="fill-purple-500"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={258}
                    textAnchor="middle"
                    className="fill-zinc-400 text-xs"
                  >
                    {item.label}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="fill-white text-xs"
                  >
                    {item.value > 0 ? `€${item.value.toFixed(0)}` : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  if (availableYears.length === 0) {
    return <p className="text-zinc-500">There are no monthly results yet.</p>;
  }

  const completionPercent =
    selectedMonthData?.plannedGrossIncome > 0
      ? (selectedMonthData.actualGrossIncome /
          selectedMonthData.plannedGrossIncome) *
        100
      : 0;

  const safePercent = Math.min(completionPercent, 100);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Monthly Results</h2>

        <div className="mb-5">
          <p className="text-sm text-zinc-400 mb-2">Select Year</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {availableYears.map((year) => {
              const isActive = year === selectedYear;

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium border transition-all ${
                    isActive
                      ? "bg-purple-600 border-purple-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm text-zinc-400 mb-2">Select Month</p>
          <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
            {monthLongNames.map((monthName, index) => {
              const monthKey = `${selectedYear}-${String(index + 1).padStart(
                2,
                "0"
              )}`;
              const hasData = Boolean(groupedResults[monthKey]);
              const isActive = index === selectedMonthIndex;

              return (
                <button
                  key={monthName}
                  type="button"
                  onClick={() => setSelectedMonthIndex(index)}
                  className={`rounded-xl px-3 py-3 text-xs sm:text-sm font-medium border transition-all ${
                    isActive
                      ? "bg-purple-600 border-purple-500 text-white"
                      : hasData
                      ? "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      : "bg-zinc-950 border-zinc-900 text-zinc-600"
                  }`}
                >
                  {monthShortNames[index]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedMonthData ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold">{selectedMonthData.label}</h2>

            <div className="w-full md:w-72">
              <div className="flex justify-between text-sm text-zinc-400 mb-2">
                <span>Gross Plan Completion</span>
                <span>{completionPercent.toFixed(0)}%</span>
              </div>

              <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${safePercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Planned Gross Income</p>
              <p className="text-3xl font-bold">
                €{selectedMonthData.plannedGrossIncome.toFixed(2)}
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Planned Travel Cost</p>
              <p className="text-3xl font-bold">
                €{selectedMonthData.plannedTravelCost.toFixed(2)}
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Planned Net Income</p>
              <p className="text-3xl font-bold">
                €{selectedMonthData.plannedNetIncome.toFixed(2)}
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Actual Gross Income</p>
              <p className="text-3xl font-bold">
                €{selectedMonthData.actualGrossIncome.toFixed(2)}
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Actual Travel Cost</p>
              <p className="text-3xl font-bold">
                €{selectedMonthData.actualTravelCost.toFixed(2)}
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Actual Net Income</p>
              <p className="text-3xl font-bold">
                €{selectedMonthData.actualNetIncome.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-4 text-sm text-zinc-400 flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-6">
            <span>
              Total Gigs:{" "}
              <span className="text-white font-semibold">
                {selectedMonthData.totalGigs}
              </span>
            </span>

            <span>
              Planned Gigs:{" "}
              <span className="text-white font-semibold">
                {selectedMonthData.plannedGigs}
              </span>
            </span>

            <span>
              Played Gigs:{" "}
              <span className="text-white font-semibold">
                {selectedMonthData.playedGigs}
              </span>
            </span>

            <span>
              Canceled Gigs:{" "}
              <span className="text-white font-semibold">
                {selectedMonthData.canceledGigs}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-2">
            {selectedYear !== null && selectedMonthIndex !== null
              ? `${monthLongNames[selectedMonthIndex]} ${selectedYear}`
              : "Monthly Results"}
          </h2>
          <p className="text-zinc-400">There are no results for this month.</p>
        </div>
      )}

      {mostProfitableClub && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-4">Most Profitable Club</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Club</p>
              <p className="text-2xl font-bold">{mostProfitableClub.venue}</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Actual Net Income</p>
              <p className="text-3xl font-bold">
                €{mostProfitableClub.netIncome.toFixed(2)}
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Played Gigs</p>
              <p className="text-3xl font-bold">
                {mostProfitableClub.playedGigs}
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 mb-2">Actual Gross Income</p>
              <p className="text-3xl font-bold">
                €{mostProfitableClub.grossIncome.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-4 text-sm text-zinc-400">
            Travel Cost:{" "}
            <span className="text-white font-semibold">
              €{mostProfitableClub.travelCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {renderActualNetIncomeChart()}
    </div>
  );
}