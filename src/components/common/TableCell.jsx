import React, { useState } from "react";
import {
  TableCell as MuiTableCell,
  Box,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import SensorsIcon from "@mui/icons-material/Sensors";
import ScannerPicker from "../Scanner/ScannerPicker";
import ScannedIdsIndicator from "../Scanner/ScannedIdsIndicator";

/**
 * Extended TableCell with a "scan" variant.
 *
 * — Normal usage (passes through to MUI TableCell):
 *     <TableCell>Some text</TableCell>
 *     <TableCell variant="head">Header</TableCell>
 *
 * — Scan variant (renders qty input + scanned count plate):
 *     <TableCell
 *       variant="scan"
 *       value={5}
 *       inventoryItemIds={['id1','id2']}
 *       onChange={(val) => setQty(val)}
 *       editable                         // default true; set false for display-only
 *       showScan                         // shows scanner picker button
 *       quantityType="OVERALL"
 *       referenceId={refId}
 *       productId={prodId}
 *       scanType="ORDER_PACKING"
 *       onScanStart={...}
 *       onScanStop={...}
 *       onScanMessage={...}
 *     />
 */
const TableCell = ({
  variant,
  // — scan variant props —
  value,
  onChange,
  disabled = false,
  editable = true,
  label,
  quantityType,
  referenceId,
  productId,
  scanType,
  onScanStart,
  onScanStop,
  onScanMessage,
  showScan = false,
  inventoryItemIds = [],
  // — TableCell props —
  children,
  align,
  sx: cellSx,
  ...tableCellProps
}) => {
  // For non-scan variants, just render a normal MUI TableCell
  if (variant !== "scan") {
    return (
      <MuiTableCell variant={variant} align={align} sx={cellSx} {...tableCellProps}>
        {children}
      </MuiTableCell>
    );
  }

  // — scan variant —
  return (
    <ScanCellContent
      value={value}
      onChange={onChange}
      disabled={disabled}
      editable={editable}
      label={label}
      quantityType={quantityType}
      referenceId={referenceId}
      productId={productId}
      scanType={scanType}
      onScanStart={onScanStart}
      onScanStop={onScanStop}
      onScanMessage={onScanMessage}
      showScan={showScan}
      inventoryItemIds={inventoryItemIds}
      align={align}
      cellSx={cellSx}
      tableCellProps={tableCellProps}
    />
  );
};

/** Inner component so we can use hooks (useState) only for the scan variant */
const ScanCellContent = ({
  value = 0,
  onChange,
  disabled,
  editable,
  label,
  quantityType,
  referenceId,
  productId,
  scanType,
  onScanStart,
  onScanStop,
  onScanMessage,
  showScan,
  inventoryItemIds,
  align = "center",
  cellSx,
  tableCellProps,
}) => {
  const [isLocalScanning, setIsLocalScanning] = useState(false);
 const sortedIds = [...(inventoryItemIds || [])].sort((a, b) => a - b);
  const scannedCount = sortedIds.length;
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
    <MuiTableCell
      align={align}
      sx={{ py: 0.75, px: 1, ...cellSx }}
      {...tableCellProps}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.75,
        }}
      >
        {/* Combined value + scanned count */}
<Box
  sx={{
    display: "grid",
    gridTemplateColumns: "auto auto",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 1
  }}
>
  {/* Quantity */}
 {editable ? (
 <TextField
  type="number"
  size="small"
  disabled={disabled}
  value={value}
  onChange={(e) => onChange?.(Number(e.target.value))}
  variant="outlined"
  inputProps={{
    min: 0,
    style: {
      textAlign: "right",
      fontWeight: 600,
      fontSize: "0.95rem",
      width: 80
    }
  }}
  sx={{
    "& .MuiOutlinedInput-root": {
      height: 30
    },
    "& input": {
      padding: "0px 8px",
      height: "30px"
    },
    "& input[type=number]": {
      MozAppearance: "textfield"
    },
    "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      margin: 0
    }
  }}
/>
) : (
 <Box
  sx={{
    width: 80,
    height: 20,   // RFID pill height same
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end"
  }}
>
  <Typography
    sx={{
      fontWeight: 600,
      fontSize: "0.95rem",
      lineHeight: 1   // important
    }}
  >
    {value}
  </Typography>
</Box>
)}

  {/* RFID pill */}
 {hasScannedIds ? (
  <ScannedIdsIndicator ids={sortedIds}>
    <Tooltip
      title={`View ${scannedCount} scanned ID${scannedCount !== 1 ? "s" : ""}`}
      arrow
    >
     <Box
  sx={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 0.5,
    px: 0.6,
    height: 20,
    minWidth: 30,
    borderRadius: "999px",
    backgroundColor: "#fff3ee",
    border: "1px solid #f4511e",
    mt: editable ? "3px" : -0.2
  }}
>
        <SensorsIcon sx={{ fontSize: 14, color: "#f4511e" }} />

        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "0.8rem",
            color: "#f4511e"
          }}
        >
          {scannedCount}
        </Typography>
      </Box>
    </Tooltip>
  </ScannedIdsIndicator>
) : (
  <Box sx={{ width: 48 }} />
)}
</Box>

        {/* Scanner picker */}
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
    </MuiTableCell>
  );
};

export default TableCell;
