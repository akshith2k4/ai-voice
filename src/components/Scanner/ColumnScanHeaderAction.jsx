import React, { useState, useCallback } from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import ScannerPicker from "./ScannerPicker";
import ScannedIdsIndicator from "./ScannedIdsIndicator";

const ColumnScanHeaderAction = ({
  label,
  tooltip = "Scan All",
  disabled = false,
  quantityType,
  referenceId,
  scanType,
  onProductScanned,
  onScanStart,
  onScanStop,
  onScanMessage,
  onError,
  inventoryItemIds = [],
}) => {
  const [isColumnScanning, setIsColumnScanning] = useState(false);

  const handleScanStart = useCallback((data) => {
    setIsColumnScanning(true);
    onScanStart?.(data);
  }, [onScanStart]);

  const handleScanStop = useCallback(() => {
    setIsColumnScanning(false);
    onScanStop?.();
  }, [onScanStop]);

  const handleInternalScanMessage = useCallback(
    (scanData) => {
      onScanMessage?.(scanData);

      const scannedProductId =
        scanData?.productId ||
        scanData?.data?.productId ||
        scanData;

      if (!scannedProductId) return;

      onProductScanned?.(scannedProductId, quantityType);
    },
    [onProductScanned, quantityType, onScanMessage]
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        position: "relative",
      }}
    >
      <ScannedIdsIndicator ids={inventoryItemIds}>
        <Tooltip title={inventoryItemIds.length > 0 ? "Click to view overall scanned IDs" : ""} placement="top" arrow>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: inventoryItemIds.length > 0 ? "primary.main" : "text.primary",
              textDecoration: inventoryItemIds.length > 0 ? "underline" : "none",
              textDecorationStyle: "dashed",
              textUnderlineOffset: "4px",
            }}
          >
            {label}
          </Typography>
        </Tooltip>
      </ScannedIdsIndicator>

      <span>
        <ScannerPicker
          quantityType={quantityType}
          referenceId={referenceId}
          scanType={scanType}
          disabled={disabled}
          onScanStart={handleScanStart}
          onScanStop={handleScanStop}
          onScanMessage={handleInternalScanMessage}
          onError={onError}
        />
      </span>
    </Box>
  );
};

export default ColumnScanHeaderAction;