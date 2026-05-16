import { Box, Popper, Paper, Typography } from "@mui/material";
import { useDcid } from "../../context/DcidContext";
import { useEffect, useState } from "react";

export default function LockOverlayUI() {
  const { requireWarehouse } = useDcid();
  //anchoe element which is used to position
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    if (requireWarehouse) {
      const pill = document.querySelector('[aria-label="Select warehouse"]');
      setAnchorEl(pill);
    } else {
      setAnchorEl(null);
    }
  }, [requireWarehouse]);

  if (!requireWarehouse || !anchorEl) return null;

  return (
    <>
      {/* DARK OVERLAY — HARD BLOCK */}
      <Box
        onMouseDownCapture={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClickCapture={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        sx={{
          position: "fixed",
          inset: 0,
          bgcolor: "rgba(0,0,0,0.6)",
          zIndex: (t) => t.zIndex.modal,
          pointerEvents: "auto", // MUST be auto
        }}
      />

      {/* TOOLTIP GUIDANCE */}
      <Popper
        open
        anchorEl={anchorEl}
        placement="right-start"
        modifiers={[{ name: "offset", options: { offset: [12, 0] } }]}
        sx={{
          zIndex: (t) => t.zIndex.modal + 2,
          pointerEvents: "none", // tooltip only, no interaction
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 1.5,
            bgcolor: "#2e7d32",
            color: "#fff",
            maxWidth: 260,
            borderRadius: 1,
          }}
        >
          <Typography fontWeight={700} fontSize="0.9rem">
            Warehouse required
          </Typography>
          <Typography fontSize="0.8rem" sx={{ mt: 0.5 }}>
            Please select a warehouse to continue
          </Typography>
        </Paper>
      </Popper>
    </>
  );
}
