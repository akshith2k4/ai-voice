import React from "react";
import { Stack, Box, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

export default function EmptyState({ icon = <CheckCircleOutlineIcon />, title = "All clear", subtitle }) {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 6, color: "text.secondary" }} spacing={1}>
      <Box sx={{ opacity: 0.6 }}>{icon}</Box>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" sx={{ maxWidth: 520, textAlign: "center" }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}
