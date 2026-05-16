import React from "react";
import { Paper, Typography, Box } from "@mui/material";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const fmt = (v) => (isNum(v) ? v.toLocaleString() : v ?? "-");

export default function MetricCard({ label, value, accent, caption }) {
  return (
    <Paper
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${fmt(value)}`}
      sx={{
        p: 2,
        minWidth: 220,
        position: "relative",
        overflow: "hidden",
        display: "block",
        outline: "none",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 26px rgba(0,0,0,0.12)",
        },
        "&:focus-visible": {
          boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}44`,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.lighter ?? "#90caf9"}22, transparent)`,
          pointerEvents: "none",
        },
      }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.6 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
        {fmt(value)}
      </Typography>
      {caption ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {caption}
        </Typography>
      ) : null}
      <Box sx={{ height: 3, mt: 1.25, borderRadius: 2, background: accent, opacity: 0.6 }} />
    </Paper>
  );
}
