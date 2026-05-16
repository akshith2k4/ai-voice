import React, { useState } from "react";
import { Box, TextField, Typography, Tooltip } from "@mui/material";
import ScannerPicker from "./ScannerPicker";
import ScannedIdsIndicator from "./ScannedIdsIndicator";

const QuantityScanInput = ({
  label,
  value = 0,
  onChange,
  disabled = false,
  quantityType,
  referenceId,
  productId,
  scanType,
  onScanStart,
  onScanStop,
  onScanMessage,
  showScan = false,
  fieldWidth,
  inventoryItemIds = [],
}) => {
  const [isLocalScanning, setIsLocalScanning] = useState(false);
  const isFullWidth = fieldWidth === "100%" || !fieldWidth;
  const scannedCount = inventoryItemIds?.length || 0;
  const hasScannedIds = scannedCount > 0;

  const handleScanStart = (data) => {
    setIsLocalScanning(true);
    onScanStart?.(data);
  };

  const handleScanStop = () => {
    setIsLocalScanning(false);
    onScanStop?.();
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: isFullWidth ? "flex-start" : "flex-end",
        gap: 0.75,
        width: "100%",
        position: "relative",
      }}
    >
      {/* Combined input + scanned count container */}
      <Box
        sx={{
          display: "flex",
          alignItems: "stretch",
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: "8px",
          overflow: "hidden",
          width: isFullWidth ? "100%" : "auto",
          minWidth: 110,
          maxWidth: isFullWidth ? "100%" : 110,
          height: 36,
          boxShadow: isLocalScanning
            ? "0 0 0 2px rgba(33, 150, 243, 0.3)"
            : "0 1px 2px rgba(0, 0, 0, 0.06)",
          transition: "box-shadow 0.2s ease",
          "&:hover": {
            boxShadow: disabled
              ? "0 1px 2px rgba(0, 0, 0, 0.06)"
              : "0 2px 6px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        {/* Left side — editable quantity input */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            backgroundColor: "#fff",
          }}
        >
          <TextField
            label={isFullWidth ? label : undefined}
            type="number"
            size="small"
            disabled={disabled}
            value={value}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onChange?.(Number(e.target.value))}
            inputProps={{ min: 0 }}
            fullWidth
            variant="standard"
            sx={{
              height: "100%",
              "& .MuiInput-root": {
                height: "100%",
                px: 1.25,
                "&:before, &:after": { display: "none" },
              },
              "& .MuiInputLabel-root": {
                pl: 1.25,
                fontSize: "0.8rem",
              },
              "& input[type=number]": {
                MozAppearance: "textfield",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "text.primary",
                py: 0,
              },
              "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
              {
                WebkitAppearance: "none",
                margin: 0,
              },
            }}
          />
        </Box>

        {/* Right side — scanned count plate (non-editable, clickable) */}
        {hasScannedIds && (
          <ScannedIdsIndicator ids={inventoryItemIds}>
            <Tooltip
              title={`View ${scannedCount} scanned ID${scannedCount !== 1 ? "s" : ""}`}
              placement="top"
              arrow
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  flexShrink: 0,
                  background:
                    "linear-gradient(135deg, #43a047 0%, #2e7d32 100%)",
                  borderLeft: "1px solid rgba(0,0,0,0.12)",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "filter 0.15s ease",
                  "&:hover": {
                    filter: "brightness(1.1)",
                  },
                  "&:active": {
                    filter: "brightness(0.95)",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  {scannedCount}
                </Typography>
              </Box>
            </Tooltip>
          </ScannedIdsIndicator>
        )}
      </Box>

      {/* Scanner picker button */}
      {showScan && (
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          <ScannerPicker
            quantityType={quantityType}
            referenceId={referenceId}
            productId={productId}
            scanType={scanType}
            disabled={disabled}
            onScanStart={handleScanStart}
            onScanStop={handleScanStop}
            onScanMessage={onScanMessage}
          />

          {isLocalScanning && (
            <Box
              sx={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#43a047",
                boxShadow: "0 0 4px rgba(67, 160, 71, 0.6)",
                animation: "scanBlink 1s infinite",
                "@keyframes scanBlink": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.2 },
                  "100%": { opacity: 1 },
                },
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default QuantityScanInput;
