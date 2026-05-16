import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import {
  figureOutPickupItemStatus,
} from "../../utils/ visitItemStatus";
import ScannerHeader from "../Scanner/ScannerHeader";
import ColumnScanHeaderAction from "../Scanner/ColumnScanHeaderAction";
import { scannerController } from "../Scanner/ScannerController";
import TableCell from "../common/TableCell";
import { parseDate } from "../../utils/dateUtils";
import tripService from "../../services/tripService";

function CompletePickupDialog({
  open,
  onClose,
  selectedPickupRequest,
  selectedVisitId,
  selectedTripId,
  showSnackbar,
  fetchTrips,
}) {
  // Pickup state
  const [pickupActualQuantities, setPickupActualQuantities] = useState({});
  const [pickupHeavySoiledQuantities, setPickupHeavySoiledQuantities] = useState({});
  const [pickupDamagedQuantities, setPickupDamagedQuantities] = useState({});
  const [pickupActualIdsMap, setPickupActualIdsMap] = useState({});
  const [pickupHeavySoiledIdsMap, setPickupHeavySoiledIdsMap] = useState({});
  const [pickupDamagedIdsMap, setPickupDamagedIdsMap] = useState({});
  const [notes, setNotes] = useState("");
  const [completionDate, setCompletionDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);


  // Scanner state
  const [scanStatus, setScanStatus] = useState("IDLE");
  const [activeScan, setActiveScan] = useState(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [scanPreview, setScanPreview] = useState([]);
  const [showScannerHeader, setShowScannerHeader] = useState(false);

  const resetState = () => {
    setScanStatus("IDLE");
    setActiveScan(null);
    setScannedCount(0);
    setScanPreview([]);
    setShowScannerHeader(false);
    setPickupActualQuantities({});
    setPickupHeavySoiledQuantities({});
    setPickupDamagedQuantities({});
    setPickupActualIdsMap({});
    setPickupHeavySoiledIdsMap({});
    setPickupDamagedIdsMap({});
    setNotes("");
    setCompletionDate(new Date());
  };


  // Cleanup on close
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  // Show scanner header when active
  useEffect(() => {
    if (scanStatus === "ACTIVE" && open) {
      setShowScannerHeader(true);
    }
  }, [scanStatus, open]);

  // Initialize pickup quantities
  useEffect(() => {
    if (!selectedPickupRequest || !open) return;

    if (selectedPickupRequest.actualPickupTime) {
      setCompletionDate(parseDate(selectedPickupRequest.actualPickupTime));
    }

    const actualQty = {};
    const heavySoiledQty = {};
    const damagedQty = {};

    const actualIds = {};
    const heavySoiledIds = {};
    const damagedIds = {};

    selectedPickupRequest.expectedItems?.forEach((item) => {
      actualQty[item.id] = item.actualQuantity ?? 0;

      heavySoiledQty[item.id] = item.heavySoiledQuantity ?? 0;
      damagedQty[item.id] = item.damagedQuantity ?? 0;

      actualIds[item.id] =
        item.actualPickupItems?.map(
          (i) => i.inventoryItemId || i.referenceId || i.id
        ) ||
        item.actualInventoryItemIds ||
        [];

      heavySoiledIds[item.id] =
        item.items
          ?.filter((i) => i.conditionType === "HEAVY_SOILED")
          ?.map((i) => i.inventoryItemId) ||
        item.heavySoiledInventoryItemIds ||
        [];

      damagedIds[item.id] =
        item.items
          ?.filter((i) => i.conditionType === "DAMAGED")
          ?.map((i) => i.inventoryItemId) ||
        item.damagedInventoryItemIds ||
        [];
    });

    setPickupActualQuantities(actualQty);
    setPickupHeavySoiledQuantities(heavySoiledQty);
    setPickupDamagedQuantities(damagedQty);

    setPickupActualIdsMap(actualIds);
    setPickupHeavySoiledIdsMap(heavySoiledIds);
    setPickupDamagedIdsMap(damagedIds);

  }, [selectedPickupRequest, open]);

  const buildPickupScannedItems = (expectedItemId, pickedUpAt, noteText) => {
    const buildEntries = (inventoryIds = []) =>
      inventoryIds.map((inventoryItemId) => ({
        inventoryItemId,
        notes: noteText,
        pickedUpAt,
      }));

    return [
      ...figureOutPickupItemStatus(
        buildEntries(pickupActualIdsMap[expectedItemId]),
        "SOILED",
      ),
      ...figureOutPickupItemStatus(
        buildEntries(pickupHeavySoiledIdsMap[expectedItemId]),
        "HEAVY_SOILED",
      ),
      ...figureOutPickupItemStatus(
        buildEntries(pickupDamagedIdsMap[expectedItemId]),
        "DAMAGED",
      ),
    ];
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (!selectedPickupRequest || !selectedVisitId || !selectedTripId) {
      showSnackbar("Missing required data.", "error");
      setIsSaving(false);
      return;
    }

    const productItems = selectedPickupRequest.expectedItems.map((item) => {
      const pickedUpQty = pickupActualQuantities[item.id] ?? 0;
      const heavySoiledQty = pickupHeavySoiledQuantities[item.id] ?? 0;
      const damagedQty = pickupDamagedQuantities[item.id] ?? 0;

      return {
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        expectedQuantity: item.expectedQuantity,
        pickedUpQuantity: pickedUpQty,
        heavySoiledQuantity: heavySoiledQty,
        damagedQuantity: damagedQty,
        notes: "Picked up",
        items: buildPickupScannedItems(
          item.id,
          parseDate(completionDate).toISOString(),
          "Picked up",
        ),
      };
    });

    const completionData = {
      id: selectedPickupRequest.id,
      requestId: selectedPickupRequest.id,
      notes,
      actualPickupTime: parseDate(completionDate).toISOString(),
      challanUrl: selectedPickupRequest.challanUrl || null,
      challanNumber: selectedPickupRequest.challanNumber || null,
      productItems,
    };

    try {
      await tripService.completePickupRequest(
        selectedTripId,
        selectedVisitId,
        selectedPickupRequest.id,
        completionData,
      );
      showSnackbar("Pickup request completed successfully!", "success");
      await handleClose();
      fetchTrips();
    } catch (error) {
      console.error("Error completing pickup request:", error);
      showSnackbar(
        error.message || "Failed to complete pickup request.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    try {
      await scannerController.cancel();
    } catch (e) {
      console.error("Failed to cancel scanner session on pickup dialog close", e);
    } finally {
      onClose();
    }
  };

  const makeScanHandler = (quantityType, setQuantities, setIdsMap) => (msg) => {

    if (msg.event === "SCAN_COMPLETE" && msg.results?.items) {
      msg.results.items.forEach((scannedItem) => {
        selectedPickupRequest?.expectedItems?.forEach((tableItem) => {
          if (tableItem.product?.id === scannedItem.productId) {
            setQuantities((prev) => ({
              ...prev,
              [tableItem.id]: (prev[tableItem.id] || 0) + 1,
            }));
            setIdsMap((prev) => {
              const existing = prev[tableItem.id] || [];
              if (existing.includes(scannedItem.inventoryItemId)) return prev;
              return {
                ...prev,
                [tableItem.id]: [...existing, scannedItem.inventoryItemId],
              };
            });
          }
        });

        setScannedCount((c) => c + 1);
        setScanPreview((prev) => [
          {
            id: scannedItem.inventoryItemId,
            productName: scannedItem.productName,
            scanType: "PICKUP_COMPLETED",
            quantityType,
          },
          ...prev,
        ].slice(0, 20));
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Complete Pickup Request</DialogTitle>
      {showScannerHeader && (
        <Box sx={{ mb: 2 }}>
          <ScannerHeader
            status={scanStatus}
            scannedCount={scannedCount}
            scanPreview={scanPreview}
            onStop={() => {
              setScanStatus("IDLE");
              setActiveScan(null);
              setScannedCount(0);
              setScanPreview([]);
              setShowScannerHeader(false);
            }}
            onCancel={resetState}
          />
        </Box>
      )}

      <DialogContent>
        {selectedPickupRequest && (
          <>
            <Typography variant="body2">
              <strong>Request Number:</strong>{" "}
              {selectedPickupRequest.requestNumber}
            </Typography>
            {selectedPickupRequest.challanUrl && (
              <Typography variant="body2">
                <strong>Challan:</strong> {selectedPickupRequest.challanNumber || "N/A"} (
                <a
                  href={selectedPickupRequest.challanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#1976d2", textDecoration: "none", fontWeight: 500 }}
                >
                  View Document
                </a>
                )
              </Typography>
            )}
            <DateTimePicker

              label="Actual Pickup Time"
              value={completionDate}
              onChange={(newValue) => setCompletionDate(newValue)}
              sx={{ mt: 2 }}
              renderInput={(params) => (
                <TextField {...params} fullWidth />
              )}
            />
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '25%' }}>
                      <strong>Product Name</strong>
                    </TableCell>
                    <TableCell align="center" sx={{ width: '15%' }}>
                      <strong>Expected Qty</strong>
                    </TableCell>
                    <TableCell align="center" sx={{ width: '20%' }}>
                      <ColumnScanHeaderAction
                        label="Total Qty Picked"
                        quantityType="SOILED"
                        referenceId={selectedPickupRequest?.id}
                        scanType="PICKUP_COMPLETED"
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                        onScanMessage={makeScanHandler(
                          "SOILED",
                          setPickupActualQuantities,
                          setPickupActualIdsMap,
                        )}
                        inventoryItemIds={Object.values(pickupActualIdsMap).flat()}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ width: '20%' }}>
                      <ColumnScanHeaderAction
                        label="Heavy Soiled Qty"
                        quantityType="HEAVY_SOILED"
                        referenceId={selectedPickupRequest?.id}
                        scanType="PICKUP_COMPLETED"
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                        onScanMessage={makeScanHandler(
                          "HEAVY_SOILED",
                          setPickupHeavySoiledQuantities,
                          setPickupHeavySoiledIdsMap,
                        )}
                        inventoryItemIds={Object.values(pickupHeavySoiledIdsMap).flat()}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ width: '20%' }}>
                      <ColumnScanHeaderAction
                        label="Damaged Qty"
                        quantityType="DAMAGED"
                        referenceId={selectedPickupRequest?.id}
                        scanType="PICKUP_COMPLETED"
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                        onScanMessage={makeScanHandler(
                          "DAMAGED",
                          setPickupDamagedQuantities,
                          setPickupDamagedIdsMap,
                        )}
                      />
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {selectedPickupRequest.expectedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell align="center">{item.expectedQuantity}</TableCell>
                      <TableCell
                        variant="scan"
                        value={pickupActualQuantities[item.id] ?? 0}
                        quantityType="SOILED"
                        referenceId={selectedPickupRequest?.id}
                        scanType="PICKUP_COMPLETED"
                        productId={item.id}
                        inventoryItemIds={pickupActualIdsMap[item.id] || []}
                        onChange={(val) => {
                          setPickupActualQuantities((prev) => ({
                            ...prev,
                            [item.id]: val,
                          }));
                        }}
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                      />
                      <TableCell
                        variant="scan"
                        value={pickupHeavySoiledQuantities[item.id] ?? 0}
                        quantityType="HEAVY_SOILED"
                        referenceId={selectedPickupRequest?.id}
                        scanType="PICKUP_COMPLETED"
                        productId={item.id}
                        inventoryItemIds={pickupHeavySoiledIdsMap[item.id] || []}
                        onChange={(val) => {
                          setPickupHeavySoiledQuantities((prev) => ({
                            ...prev,
                            [item.id]: val,
                          }));
                        }}
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                      />
                      <TableCell
                        variant="scan"
                        value={pickupDamagedQuantities[item.id] ?? 0}
                        quantityType="DAMAGED"
                        referenceId={selectedPickupRequest?.id}
                        scanType="PICKUP_COMPLETED"
                        productId={item.id}
                        inventoryItemIds={pickupDamagedIdsMap[item.id] || []}
                        onChange={(val) => {
                          setPickupDamagedQuantities((prev) => ({
                            ...prev,
                            [item.id]: val,
                          }));
                        }}
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                      />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TextField
              label="Notes"
              fullWidth
              sx={{ mt: 2 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          color="secondary"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary" disabled={isSaving}>
          {isSaving ? "Saving..." : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CompletePickupDialog;
