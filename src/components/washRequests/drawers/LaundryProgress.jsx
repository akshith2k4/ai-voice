import React from "react";
import { Box, Typography, Divider } from "@mui/material";

// Renders the main progress donut with washEfficiencyPercentageage text
function ProgressDonut({ washEfficiencyPercentage = 0, size = 160, accent = "#2f80ed", track = "#e9eef6", centerBg = "#ffffff" }) {
  const p = Math.max(0, Math.min(100, Number(washEfficiencyPercentage) || 0));
  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: `conic-gradient(${accent} ${p}%, ${track} 0)`,
      }}
      role="img"
      aria-label={`Progress ${p}%`}
    >
      <Box
        sx={{
          position: "absolute",
          width: "70%",
          height: "70%",
          borderRadius: "50%",
          bgcolor: centerBg,
          left: "15%",
          top: "15%",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      />
      <Box sx={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f1724" }}>
          {p}%
        </Typography>
      </Box>
    </Box>
  );
}

// Renders the numeric stats list beside the donut
function SummaryStats({ stats = [] }) {
  return (
    <Box sx={{ minWidth: 180, display: "flex", flexDirection: "column", gap: 1.25 }}>
      {stats.map((stat) => (
        <Box key={stat.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" sx={{ color: "#7b8a99", fontWeight: 600 }}>
            {stat.label}:
          </Typography>
          <Typography variant="body2" sx={{ color: "#111827", fontWeight: 600 }}>
            {stat.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// Renders a compact mini donut used for wash days
function MiniDonut({ washEfficiencyPercentage = 0, size = 64, accent = "#7bd389", track = "#f0f4fb", centerBg = "#ffffff" }) {
  const p = Math.max(0, Math.min(100, Number(washEfficiencyPercentage) || 0));
  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(${accent} ${p}%, ${track} 0)`,
        display: "grid",
        placeItems: "center",
      }}
      role="img"
      aria-label={`Progress ${p}%`}
    >
      <Box
        sx={{
          position: "absolute",
          width: "62%",
          height: "62%",
          borderRadius: "50%",
          bgcolor: centerBg,
          left: "19%",
          top: "19%",
        }}
      />
      <Typography variant="caption" sx={{ fontWeight: 700, color: "#0f1724", position: "relative", zIndex: 1 }}>
        {p}%
      </Typography>
    </Box>
  );
}

// Renders a labels for mini donut
function AttemptCircle({ washEfficiencyPercentage, label }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <MiniDonut washEfficiencyPercentage={washEfficiencyPercentage} />
      <Typography variant="caption" sx={{ color: "#7b8a99" }}>
        {label}
      </Typography>
    </Box>
  );
}

// Renders the laundry progress with summary and attempts
export default function LaundryProgress({ washRequestData }) {
  const washDays = Array.isArray(washRequestData?.washDays) ? washRequestData.washDays : [];

  const productSoiledItemsTotal = washRequestData?.productSoiledItemsTotal ?? washRequestData?.productSoiledTotals ?? {};

  const soiledSent = Number(productSoiledItemsTotal?.soiledQuantitySentTotal ?? 0);
  const washedReceived = Number(productSoiledItemsTotal?.totalWashedQuantityReceivedTotal ?? 0);
  const soiledReceived = Number(productSoiledItemsTotal?.soiledQuantityReceivedTotal ?? 0);
  const damagedReceived = Number(productSoiledItemsTotal?.damagedQuantityReceivedTotal ?? 0);

  let washEfficiencyPercentage = 0;
  if (washedReceived > 0) {
    const numerator = damagedReceived + soiledReceived;
    if (numerator > 0) {
      washEfficiencyPercentage = 100 - (numerator / washedReceived) * 100;
    } else if (soiledSent > 0) {
      washEfficiencyPercentage = (washedReceived / soiledSent) * 100;
    }
  }
  washEfficiencyPercentage = Math.round(Math.max(0, Math.min(100, washEfficiencyPercentage)));

  const summaryStats = [
    { label: "Soiled Sent", value: soiledSent },
    { label: "Washed Received", value: washedReceived },
    { label: "Soiled Received", value: soiledReceived },
    { label: "Damaged Received", value: damagedReceived },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
        <ProgressDonut washEfficiencyPercentage={washEfficiencyPercentage} size={190} />
        <SummaryStats stats={summaryStats} />
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {washDays.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ color: "#2e7d32", fontWeight: 600, mb: 1 }}>
            Wash Days
          </Typography>
          <Box sx={{ height: 1, my: 2, background: "linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03))" }} />
          <Box sx={{ display: "flex", gap: 3, alignItems: "center", justifyContent: "left", flexWrap: "wrap" }}>
            {washDays.map((d, idx) => {
              const daySoiled = Number(d?.totalSoiledSent ?? 0);
              const dayWashed = Number(d?.totalWashedReceived ?? 0);
              let p = 0;
              if (daySoiled > 0 && dayWashed > 0) {
                p = Math.round(Math.max(0, Math.min(100, (dayWashed / daySoiled) * 100)));
              }
              return (
                <AttemptCircle
                  key={`wash-day-${idx}`}
                  washEfficiencyPercentage={p}
                  label={`Day ${idx + 1}`}
                />
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}
