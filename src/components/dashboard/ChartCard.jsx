import React from "react";
import { Paper, Stack, Box, Typography, Divider } from "@mui/material";
import EmptyState from "./EmptyState";
import ChartSkeleton from "./ChartSkeleton";

export default function ChartCard({ title, subtitle, children, actions, isLoading, isEmpty }) {
  return (
    <Paper sx={{ p: 2, display: "block", contentVisibility: "auto", containIntrinsicSize: "320px 260px" }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {actions}
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {isLoading ? <ChartSkeleton /> : isEmpty ? <EmptyState subtitle="No data for the selected period." /> : children}
    </Paper>
  );
}
