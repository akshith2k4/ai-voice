import React, { useMemo } from "react";
import { Box, Stack } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import ChartCard from "../components/dashboard/ChartCard";
import MetricCard from "../components/dashboard/MetricCard";
import { safeNumber } from "./quantityUtils";

export default function AnalysisSection({ title, metrics, xAxis, xAxisValueFormatter, series }) {
  const isEmpty = series.every((item) => (Array.isArray(item?.data) ? item.data : []).every((value) => safeNumber(value) === 0));
  const normalizedSeries = useMemo(
    () =>
      series.map(({ id: _ignoredId, data: _ignoredData, ...item }, index) => ({
        label: item.label,
        data: Array.isArray(series[index]?.data) ? series[index].data : [],
        color: item.color,
        valueFormatter: item.valueFormatter,
      })),
    [series]
  );

  return (
    <ChartCard title={title} isLoading={false} isEmpty={isEmpty}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2.5, mb: 3 }}>
        {metrics.map((metric) => (
          <Box key={metric.label} sx={{ flex: 1, minWidth: 180 }}>
            <MetricCard label={metric.label} value={metric.value} accent={metric.color} />
          </Box>
        ))}
      </Stack>

      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <BarChart
          height={280}
          xAxis={[{ scaleType: "band", data: xAxis, valueFormatter: xAxisValueFormatter }]}
          series={normalizedSeries}
          margin={{ left: 50, right: 20, top: 20, bottom: 40 }}
          slotProps={{ tooltip: { trigger: "axis" } }}
        />
      </Box>
    </ChartCard>
  );
}
