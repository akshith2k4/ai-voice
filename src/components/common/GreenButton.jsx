import React from "react";
import { Button } from "@mui/material";

/**
 * Reusable Green Button with gradient styling
 * @param {object} props - MUI Button props (onClick, disabled, children, sx, etc.)
 */
export default function GreenButton({ children = "Apply", sx, ...props }) {
  return (
    <Button
      variant="contained"
      sx={{
        height: 40,
        minWidth: 96,
        whiteSpace: "nowrap",
        textTransform: "none",
        background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
        boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
