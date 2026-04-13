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
          plannedCosts: 0,
          plannedNetIncome: 0,
          actualGrossIncome: 0,
          actualCosts: 0,
          actualNetIncome: 0,
        };
      }

      const fee = Number(gig.fee || 0);
      const travelCost = Number(gig.travelCost || gig.travel_cost || 0);
      const extraCosts = Number(gig.extraCosts || gig.extra_costs || 0);
      const totalCosts = travelCost + extraCosts;
      const netProfit = Number(gig.netProfit || gig.net_profit || 0);

      acc[monthKey].totalGigs += 1;
      acc[monthKey].plannedGrossIncome += fee;
      acc[monthKey].plannedCosts += totalCosts;
      acc[monthKey].plannedNetIncome += netProfit;

      if (gig.status === "Planned") {
        acc[monthKey].plannedGigs += 1;
      }

      if (gig.status === "Played") {
        acc[monthKey].playedGigs += 1;
        acc[monthKey].actualGrossIncome += fee;
        acc[monthKey].actualCosts += totalCosts;
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

    const now = new Date();
    const currentYear = now.getFullYear();

    setSelectedYear((currentYearState) => {
      if (currentYearState && availableYears.includes(currentYearState)) {
        return currentYearState;
      }

      if (availableYears.includes(currentYear)) {
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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const availableMonthIndexes = monthsInSelectedYear.map(
      (month) => month.monthIndex
    );

    if (selectedYear === currentYear) {
      setSelectedMonthIndex(currentMonth);
      return;
    }

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

  const selectedYearSummary = useMemo(() => {
    if (!selectedYear) return null;

    const yearMonths = Object.values(groupedResults).filter(
      (month) => month.year === selectedYear
    );

    if (yearMonths.length === 0) {
      return {
        grossIncome: 0,
        netIncome: 0,
        plannedCosts: 0,
        actualCosts: 0,
        plannedGigs: 0,
        playedGigs: 0,
      };
    }

    return yearMonths.reduce(
      (acc, month) => {
        acc.grossIncome += month.actualGrossIncome;
        acc.netIncome += month.actualNetIncome;
        acc.plannedCosts += month.plannedCosts;
        acc.actualCosts += month.actualCosts;
        acc.plannedGigs += month.plannedGigs;
        acc.playedGigs += month.playedGigs;
        return acc;
      },
      {
        grossIncome: 0,
        netIncome: 0,
        plannedCosts: 0,
        actualCosts: 0,
        plannedGigs: 0,
        playedGigs: 0,
      }
    );
  }, [groupedResults, selectedYear]);

  function buildTopClub(filteredGigs) {
    const clubMap = filteredGigs.reduce((acc, gig) => {
      if (gig.status !== "Played") return acc;

      const venueName = gig.venue || "Unknown Club";
      const grossIncome = Number(gig.fee || 0);
      const travelCost = Number(gig.travelCost || gig.travel_cost || 0);
      const extraCosts = Number(gig.extraCosts || gig.extra_costs || 0);
      const totalCosts = travelCost + extraCosts;
      const netProfit = Number(gig.netProfit || gig.net_profit || 0);

      if (!acc[venueName]) {
        acc[venueName] = {
          venue: venueName,
          playedGigs: 0,
          grossIncome: 0,
          totalCosts: 0,
          netIncome: 0,
        };
      }

      acc[venueName].playedGigs += 1;
      acc[venueName].grossIncome += grossIncome;
      acc[venueName].totalCosts += totalCosts;
      acc[venueName].netIncome += netProfit;

      return acc;
    }, {});

    return Object.values(clubMap).sort((a, b) => b.netIncome - a.netIncome)[0];
  }

  const topClubThisMonth = useMemo(() => {
    if (!selectedYear || selectedMonthIndex === null) return null;

    const filteredGigs = gigs.filter((gig) => {
      if (!gig.eventDate) return false;

      const date = new Date(gig.eventDate);

      return (
        date.getFullYear() === selectedYear &&
        date.getMonth() === selectedMonthIndex
      );
    });

    return buildTopClub(filteredGigs);
  }, [gigs, selectedYear, selectedMonthIndex]);

  const topClubThisYear = useMemo(() => {
    if (!selectedYear) return null;

    const filteredGigs = gigs.filter((gig) => {
      if (!gig.eventDate) return false;

      const date = new Date(gig.eventDate);

      return date.getFullYear() === selectedYear;
    });

    return buildTopClub(filteredGigs);
  }, [gigs, selectedYear]);

  function getChartData() {
    if (!selectedYear) return [];

    return monthShortNames.map((label, index) => {
      const monthKey = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
      const monthData = groupedResults[monthKey];

      return {
        label,
        plannedValue: monthData ? monthData.plannedNetIncome : 0,
        actualValue: monthData ? monthData.actualNetIncome : 0,
      };
    });
  }

  function renderActualNetIncomeChart() {
    const chartData = getChartData();

    const maxValue = Math.max(
      ...chartData.map((item) => Math.max(item.plannedValue, item.actualValue)),
      1
    );

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
              const x = leftPadding + index * (barWidth + gap);

              const plannedHeight =
                item.plannedValue > 0
                  ? (item.plannedValue / maxValue) * chartHeight
                  : 0;

              const actualHeight =
                item.actualValue > 0
                  ? (item.actualValue / maxValue) * chartHeight
                  : 0;

              const plannedY = 240 - plannedHeight;
              const actualY = 240 - actualHeight;

              const progressHeight =
                item.plannedValue > 0
                  ? (Math.min(item.actualValue, item.plannedValue) / maxValue) *
                    chartHeight
                  : 0;

              const progressY = 240 - progressHeight;

              const exceedsPlan =
                item.plannedValue > 0 && item.actualValue > item.plannedValue;

              const overflowHeight = exceedsPlan
                ? ((item.actualValue - item.plannedValue) / maxValue) *
                  chartHeight
                : 0;

              const overflowY = plannedY - overflowHeight;

              const labelY =
                item.actualValue > 0
                  ? actualY - 8
                  : item.plannedValue > 0
                  ? plannedY - 8
                  : 232;

              return (
                <g key={item.label}>
                  {item.plannedValue > 0 && (
                    <rect
                      x={x}
                      y={plannedY}
                      width={barWidth}
                      height={plannedHeight}
                      rx="8"
                      className="fill-purple-500 opacity-25"
                    />
                  )}

                  {item.plannedValue > 0 && item.actualValue > 0 && (
                    <rect
                      x={x}
                      y={progressY}
                      width={barWidth}
                      height={progressHeight}
                      rx="8"
                      className="fill-purple-500"
                    />
                  )}

                  {item.plannedValue === 0 && item.actualValue > 0 && (
                    <rect
                      x={x}
                      y={actualY}
                      width={barWidth}
                      height={actualHeight}
                      rx="8"
                      className="fill-purple-500"
                    />
                  )}

                  {exceedsPlan && (
                    <rect
                      x={x}
                      y={overflowY}
                      width={barWidth}
                      height={overflowHeight}
                      rx="8"
                      className="fill-purple-500"
                    />
                  )}

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
                    y={labelY}
                    textAnchor="middle"
                    className="fill-white text-xs"
                  >
                    {item.actualValue > 0 ? `€${item.actualValue.toFixed(0)}` : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  function renderTopClubCard(title, clubData, subtitle) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
        </div>

        {clubData ? (
          <>
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
                Club
              </p>
              <p className="text-xl font-bold text-white break-words">
                {clubData.venue}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Net</p>
                <p className="text-lg font-bold">
                  €{clubData.netIncome.toFixed(2)}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Played</p>
                <p className="text-lg font-bold">{clubData.playedGigs}</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Gross</p>
                <p className="text-lg font-bold">
                  €{clubData.grossIncome.toFixed(2)}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Costs</p>
                <p className="text-lg font-bold">
                  €{clubData.totalCosts.toFixed(2)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400">No data</p>
          </div>
        )}
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
              <p className="text-sm text-zinc-400 mb-2">Planned Costs</p>
              <p className="text-3xl font-bold">
                €{selectedMonthData.plannedCosts.toFixed(2)}
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
              <p className="text-sm text-zinc-400 mb-2">Actual Costs</p>
              <p className="text-3xl font-bold">
                €{selectedMonthData.actualCosts.toFixed(2)}
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {renderTopClubCard(
          "Top Club This Month",
          topClubThisMonth,
          selectedYear !== null && selectedMonthIndex !== null
            ? `${monthLongNames[selectedMonthIndex]} ${selectedYear}`
            : "Selected month"
        )}

        {renderTopClubCard(
          "Top Club This Year",
          topClubThisYear,
          selectedYear ? `${selectedYear}` : "Selected year"
        )}
      </div>

      {renderActualNetIncomeChart()}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Year Gross Income</p>
          <p className="text-2xl md:text-3xl font-bold">
            €{Number(selectedYearSummary?.grossIncome || 0).toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Played gigs: {Number(selectedYearSummary?.playedGigs || 0)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Year Net Income</p>
          <p className="text-2xl md:text-3xl font-bold">
            €{Number(selectedYearSummary?.netIncome || 0).toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Planned / Played: {Number(selectedYearSummary?.plannedGigs || 0)} /{" "}
            {Number(selectedYearSummary?.playedGigs || 0)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Year Planned Costs</p>
          <p className="text-2xl md:text-3xl font-bold">
            €{Number(selectedYearSummary?.plannedCosts || 0).toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Planned gigs: {Number(selectedYearSummary?.plannedGigs || 0)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Year Actual Costs</p>
          <p className="text-2xl md:text-3xl font-bold">
            €{Number(selectedYearSummary?.actualCosts || 0).toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Played gigs: {Number(selectedYearSummary?.playedGigs || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}