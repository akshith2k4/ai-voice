import { LAUNDRY_COLORS } from "../constants/laundryColors";

export const buildWashAnalysisSections = (chartData) => [
  {
    title: "Wash Analysis",
    metrics: [
      { label: "Wash Sent", value: chartData.totals.washSentTotal, color: LAUNDRY_COLORS.sent },
      { label: "Wash Received", value: chartData.totals.washCleanTotal, color: LAUNDRY_COLORS.clean },
      { label: "Soiled Received", value: chartData.totals.washSoiledTotal, color: LAUNDRY_COLORS.soiled },
      { label: "Wash Efficiency", value: `${chartData.totals.washEfficiencyTotal}%`, color: LAUNDRY_COLORS.heavy },
    ],
    xAxisValueFormatter: (value, context) => {
      if (context.location !== "tooltip") return value;
      const efficiency = chartData.wash.efficiency[value] ?? 0;
      return `${chartData.xAxisTooltipMap[value] || value} | Efficiency: ${efficiency}%`;
    },
    series: [
      {
        id: "wash-sent",
        label: "Wash Sent",
        data: chartData.xAxis.map((label) => chartData.wash.sent[label]),
        color: LAUNDRY_COLORS.sent,
        valueFormatter: (value) => `${value}`,
      },
      {
        id: "wash-received",
        label: "Wash Received",
        data: chartData.xAxis.map((label) => chartData.wash.clean[label]),
        color: LAUNDRY_COLORS.clean,
        valueFormatter: (value) => `${value}`,
      },
      {
        id: "wash-soiled-received",
        label: "Soiled Received",
        data: chartData.xAxis.map((label) => chartData.wash.soiled[label]),
        color: LAUNDRY_COLORS.soiled,
        valueFormatter: (value) => `${value}`,
      },
    ],
  },
  {
    title: "Rewash Analysis",
    metrics: [
      { label: "Rewash Sent", value: chartData.totals.rewashSentTotal, color: LAUNDRY_COLORS.sent },
      { label: "Rewash Received", value: chartData.totals.rewashCleanTotal, color: LAUNDRY_COLORS.clean },
      { label: "Rewash Soiled Received", value: chartData.totals.rewashSoiledTotal, color: LAUNDRY_COLORS.soiled },
      { label: "Rewash Efficiency", value: `${chartData.totals.rewashEfficiencyTotal}%`, color: LAUNDRY_COLORS.heavy },
    ],
    xAxisValueFormatter: (value, context) => {
      if (context.location !== "tooltip") return value;
      const efficiency = chartData.rewash.efficiency[value] ?? 0;
      return `${chartData.xAxisTooltipMap[value] || value} | Efficiency: ${efficiency}%`;
    },
    series: [
      {
        id: "rewash-sent",
        label: "Rewash Sent",
        data: chartData.xAxis.map((label) => chartData.rewash.sent[label]),
        color: LAUNDRY_COLORS.sent,
        valueFormatter: (value) => `${value}`,
      },
      {
        id: "rewash-clean-received",
        label: "Rewash Received",
        data: chartData.xAxis.map((label) => chartData.rewash.clean[label]),
        color: LAUNDRY_COLORS.clean,
        valueFormatter: (value) => `${value}`,
      },
      {
        id: "rewash-soiled-received",
        label: "Rewash Soiled Received",
        data: chartData.xAxis.map((label) => chartData.rewash.soiled[label]),
        color: LAUNDRY_COLORS.soiled,
        valueFormatter: (value) => `${value}`,
      },
    ],
  },
  {
    title: "Damage Analysis",
    metrics: [{ label: "Damaged Received", value: chartData.totals.damageTotal, color: LAUNDRY_COLORS.damaged }],
    xAxisValueFormatter: (value, context) => (context.location === "tooltip" ? chartData.xAxisTooltipMap[value] || value : value),
    series: [
      {
        id: "damage-received",
        label: "Damaged Received",
        data: chartData.xAxis.map((label) => chartData.damage.damaged[label]),
        color: LAUNDRY_COLORS.damaged,
      },
    ],
  },
];
