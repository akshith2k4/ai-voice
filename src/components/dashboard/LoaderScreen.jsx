import React, { Fragment } from "react";
import { Box, GlobalStyles } from "@mui/material";

export default function LoaderScreen({ minHeight = "calc(100vh - 64px)", boxSx = {} }) {
  return (
    <Fragment>
      <GlobalStyles
        styles={{
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" },
          },
        }}
      />
      <Box sx={{ minHeight, display: "flex", alignItems: "center", justifyContent: "center", ...boxSx }}>
        <Box
          component="img"
          src="/linen.png"
          alt="Loading"
          sx={{
            width: 52,
            height: 52,
            animation: "spin 1.2s linear infinite",
            filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.16))",
            userSelect: "none",
            pointerEvents: "none",
            // Preserve original aspect ratio without distortion
            objectFit: "contain",
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        />
      </Box>
    </Fragment>
  );
}
