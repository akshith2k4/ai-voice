import React from "react";
import { Box, Skeleton } from "@mui/material";

export default function ChartSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" height={24} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={220} />
    </Box>
  );
}
