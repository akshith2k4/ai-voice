import React from "react";
import { Box } from "@mui/material";

const GlowingDot = ({ color = "#4caf50", size = 10 }) => {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 0 0 rgba(76, 175, 80, 0.7)`,
        animation: "pulse-glow 1.5s infinite ease-in-out",
        "@keyframes pulse-glow": {
          "0%": {
            transform: "scale(0.9)",
            boxShadow: "0 0 0 0 rgba(76, 175, 80, 0.7)",
          },
          "70%": {
            transform: "scale(1.1)",
            boxShadow: "0 0 0 8px rgba(76, 175, 80, 0)",
          },
          "100%": {
            transform: "scale(0.9)",
            boxShadow: "0 0 0 0 rgba(76, 175, 80, 0)",
          },
        },
      }}
    />
  );
};

export default GlowingDot;
