import React from "react";
import { Box, Stack, Typography } from "@mui/material";

export default function Section({ title, actions, children, sx }) {
  return (
    <Box sx={{ display: "block", ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {actions}
      </Stack>
      {children}
    </Box>
  );
}
