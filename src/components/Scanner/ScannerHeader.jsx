import React, { useEffect, useRef } from "react";
import { Box, Stack, Typography, Button } from "@mui/material";
import { scannerController } from "./ScannerController";

const PREVIEW_GRID_TEMPLATE = "100px minmax(160px, 1fr) 140px 180px";

const ScannerHeader = ({
  status = "IDLE",
  scannedCount = 0,
  scanPreview = [],
  onCancel,
}) => {
  const isActive = status === "ACTIVE";
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [scanPreview]);

  const handleCancelClick = async () => {
    try {
      await scannerController.cancel();
    } catch (e) {
      console.error("Failed to cancel scan session", e);
    } finally {
      onCancel?.();
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: "#F9FAFB",
        border: "1px solid #E5E7EB",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="stretch">
        <Box
          sx={{
            flex: 1,
            border: "1px solid #E5E7EB",
            borderRadius: 1,
            backgroundColor: "#fff",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: PREVIEW_GRID_TEMPLATE,
              px: 1,
              py: 0.5,
              bgcolor: "#F3F4F6",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <Typography fontSize={11}>ID</Typography>
            <Typography fontSize={11}>Product</Typography>
            <Typography fontSize={11}>Scan</Typography>
            <Typography fontSize={11}>Type</Typography>
          </Box>

          <Box
            ref={bodyRef}
            sx={{
              height: 80,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {scanPreview.length > 0 ? (
              scanPreview.map((row, idx) => (
                <Box
                  key={`${row.id}-${idx}`}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: PREVIEW_GRID_TEMPLATE,
                    px: 1,
                    py: 0.25,
                    minHeight: 24,
                    borderBottom: "1px solid #F3F4F6",
                    alignItems: "center",
                  }}
                >
                  <Typography fontSize={11} noWrap>
                    {row.id}
                  </Typography>
                  <Typography fontSize={11} noWrap>
                    {row.productName}
                  </Typography>
                  <Typography fontSize={11} noWrap title={row.scanType}>
                    {row.scanType}
                  </Typography>
                  <Typography fontSize={11} noWrap title={row.quantityType}>
                    {row.quantityType}
                  </Typography>
                </Box>
              ))
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography fontSize={11} color="text.secondary">
                  No scans yet
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 120, gap: 1 }}>
          <Box
            sx={{
              backgroundColor: "#2563EB",
              color: "#fff",
              borderRadius: 1.5,
              px: 1.5,
              py: 1,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              minWidth: 120,
              flexShrink: 0,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.65rem", fontWeight: 600, letterSpacing: 0.5 }}>
                STATUS
              </Typography>
              <Typography variant="caption" fontWeight={700}>
                {isActive ? "ACTIVE" : "IDLE"}
              </Typography>
            </Stack>

            <Box sx={{ height: "1px", backgroundColor: "rgba(255,255,255,0.2)", my: 0.25 }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.65rem", fontWeight: 600, letterSpacing: 0.5 }}>
                COUNT
              </Typography>
              <Typography variant="caption" fontWeight={700}>
                {scannedCount}
              </Typography>
            </Stack>
          </Box>

          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleCancelClick}
            fullWidth
            sx={{
              textTransform: "none",
              borderRadius: 1.5,
              fontWeight: 600,
              mt: 'auto'
            }}
          >
            Cancel
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default ScannerHeader;