import { eachDayOfInterval, endOfMonth, format, isWithinInterval, startOfMonth } from "date-fns";
import { getDayLabel, getFullDayLabel, getWeekLabel, getWeekTooltipLabel, normalizeDate } from "./dateGrouping";

export function buildWashAnalysisChartData({
  monthDate,
  granularity,
  filteredRequests,
  filteredFulfillments,
  requestTypeById,
  selectedProduct,
  cleanReceivedSource,
  requestSourceValue,
  fulfillmentSourceValue,
  requestTotals,
  fulfillmentBreakdown,
  calculateWashEfficiency,
  getFulfillmentAnalysisDate,
  isRewashType,
}) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const xAxis =
    granularity === "DAY"
      ? eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => format(date, "dd MMM"))
      : ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

  const xAxisTooltipMap =
    granularity === "DAY"
      ? eachDayOfInterval({ start: monthStart, end: monthEnd }).reduce((acc, date) => {
          acc[format(date, "dd MMM")] = getFullDayLabel(date);
          return acc;
        }, {})
      : xAxis.reduce((acc, label, index) => {
          acc[label] = getWeekTooltipLabel(index, monthStart, monthEnd) || label;
          return acc;
        }, {});

  const createBuckets = () =>
    xAxis.reduce((acc, label) => {
      acc[label] = 0;
      return acc;
    }, {});

  const wash = {
    sent: createBuckets(),
    clean: createBuckets(),
    soiled: createBuckets(),
    damaged: createBuckets(),
    efficiency: createBuckets(),
  };
  const rewash = {
    sent: createBuckets(),
    clean: createBuckets(),
    soiled: createBuckets(),
    damaged: createBuckets(),
    efficiency: createBuckets(),
  };
  const damage = {
    damaged: createBuckets(),
  };

  let washSentTotal = 0;
  let rewashSentTotal = 0;
  let washCleanTotal = 0;
  let washSoiledTotal = 0;
  let washDamagedTotal = 0;
  let washEfficiencyTotal = 0;
  let rewashCleanTotal = 0;
  let rewashSoiledTotal = 0;
  let rewashDamagedTotal = 0;
  let rewashEfficiencyTotal = 0;
  let damageTotal = 0;

  filteredRequests.forEach((request) => {
    const requestDate = normalizeDate(request?.washRequestRecordedDateTime || request?.washRequestRecordedDate);
    if (!requestDate || !isWithinInterval(requestDate, { start: monthStart, end: monthEnd })) return;

    const label = granularity === "DAY" ? getDayLabel(requestDate) : getWeekLabel(requestDate);
    if (!label || !(label in wash.sent)) return;

    const totals = requestTotals(request, selectedProduct);

    if (isRewashType(request?.washRequestType)) {
      rewash.sent[label] += totals.sent;
      rewashSentTotal += totals.sent;
      if (cleanReceivedSource === requestSourceValue) {
        rewash.clean[label] += totals.clean;
        rewash.soiled[label] += totals.soiled;
        rewash.damaged[label] += totals.damaged;
        rewashCleanTotal += totals.clean;
        rewashSoiledTotal += totals.soiled;
        rewashDamagedTotal += totals.damaged;
      }
      return;
    }

    wash.sent[label] += totals.sent;
    washSentTotal += totals.sent;
    if (cleanReceivedSource === requestSourceValue) {
      wash.clean[label] += totals.clean;
      wash.soiled[label] += totals.soiled;
      wash.damaged[label] += totals.damaged;
      washCleanTotal += totals.clean;
      washSoiledTotal += totals.soiled;
      washDamagedTotal += totals.damaged;
    }
  });

  filteredFulfillments.forEach((fulfillment) => {
    const analysisDate = getFulfillmentAnalysisDate(
      fulfillment?.washFulfillmentDate || fulfillment?.actualFulfillmentTime || fulfillment?.plannedFulfillmentTime
    );
    if (!analysisDate || !isWithinInterval(analysisDate, { start: monthStart, end: monthEnd })) return;

    const label = granularity === "DAY" ? getDayLabel(analysisDate) : getWeekLabel(analysisDate);
    if (!label || !(label in damage.damaged)) return;

    const totals = fulfillmentBreakdown(fulfillment, selectedProduct, requestTypeById);

    if (cleanReceivedSource === fulfillmentSourceValue) {
      wash.clean[label] += totals.wash.clean;
      rewash.clean[label] += totals.rewash.clean;
      washCleanTotal += totals.wash.clean;
      rewashCleanTotal += totals.rewash.clean;
    }

    wash.soiled[label] += totals.wash.soiled;
    wash.damaged[label] += totals.wash.damaged;
    washSoiledTotal += totals.wash.soiled;
    washDamagedTotal += totals.wash.damaged;

    rewash.soiled[label] += totals.rewash.soiled;
    rewashSoiledTotal += totals.rewash.soiled;
    rewash.damaged[label] += totals.rewash.damaged;
    rewashDamagedTotal += totals.rewash.damaged;

    damage.damaged[label] += totals.wash.damaged + totals.rewash.damaged;
    damageTotal += totals.wash.damaged + totals.rewash.damaged;
  });

  xAxis.forEach((label) => {
    wash.efficiency[label] = calculateWashEfficiency({
      sent: wash.sent[label],
      clean: wash.clean[label],
      soiled: wash.soiled[label],
      damaged: wash.damaged[label],
    });
    rewash.efficiency[label] = calculateWashEfficiency({
      sent: rewash.sent[label],
      clean: rewash.clean[label],
      soiled: rewash.soiled[label],
      damaged: rewash.damaged[label],
    });
  });

  washEfficiencyTotal = calculateWashEfficiency({
    sent: washSentTotal,
    clean: washCleanTotal,
    soiled: washSoiledTotal,
    damaged: washDamagedTotal,
  });
  rewashEfficiencyTotal = calculateWashEfficiency({
    sent: rewashSentTotal,
    clean: rewashCleanTotal,
    soiled: rewashSoiledTotal,
    damaged: rewashDamagedTotal,
  });

  return {
    xAxis,
    xAxisTooltipMap,
    wash,
    rewash,
    damage,
    totals: {
      washSentTotal,
      rewashSentTotal,
      washCleanTotal,
      washSoiledTotal,
      washEfficiencyTotal,
      rewashCleanTotal,
      rewashSoiledTotal,
      rewashEfficiencyTotal,
      damageTotal,
    },
  };
}
