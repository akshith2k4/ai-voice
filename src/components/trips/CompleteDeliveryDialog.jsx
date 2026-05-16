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
  figureOutDDeliveryItemStatus,
} from "../../utils/ visitItemStatus";
import ScannerHeader from "../Scanner/ScannerHeader";
import ColumnScanHeaderAction from "../Scanner/ColumnScanHeaderAction";
import { scannerController } from "../Scanner/ScannerController";
import TableCell from "../common/TableCell";
import { parseDate } from "../../utils/dateUtils";
import tripService from "../../services/tripService";

function CompleteDeliveryDialog({
  open,
  onClose,
  selectedDeliveryRequest,
  selectedVisitId,
  selectedTripId,
  tripDetails,
  showSnackbar,
  fetchTrips,
}) {
  // Delivery state
  const [actualQuantities, setActualQuantities] = useState({});
  const [deliveryReturnedFreshQuantities, setDeliveryReturnedFreshQuantities] = useState({});
  const [deliveryReturnedSoiledQuantities, setDeliveryReturnedSoiledQuantities] = useState({});
  const [deliveryReturnedDamagedQuantities, setDeliveryReturnedDamagedQuantities] = useState({});
  const [deliveryInventoryIdsMap, setDeliveryInventoryIdsMap] = useState({});
  const [deliveryReturnedFreshIdsMap, setDeliveryReturnedFreshIdsMap] = useState({});
  const [deliveryReturnedSoiledIdsMap, setDeliveryReturnedSoiledIdsMap] = useState({});
  const [deliveryReturnedDamagedIdsMap, setDeliveryReturnedDamagedIdsMap] = useState({});
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);


  // Scanner state
  const [scanStatus, setScanStatus] = useState("IDLE");
  const [activeScan, setActiveScan] = useState(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [scanPreview, setScanPreview] = useState([]);
  const [showScannerHeader, setShowScannerHeader] = useState(false);
  const [completionDate, setCompletionDate] = useState(new Date());

  const resetState = () => {
    setScanStatus("IDLE");
    setActiveScan(null);
    setScannedCount(0);
    setScanPreview([]);
    setShowScannerHeader(false);
    setActualQuantities({});
    setDeliveryReturnedFreshQuantities({});
    setDeliveryReturnedSoiledQuantities({});
    setDeliveryReturnedDamagedQuantities({});
    setDeliveryInventoryIdsMap({});
    setDeliveryReturnedFreshIdsMap({});
    setDeliveryReturnedSoiledIdsMap({});
    setDeliveryReturnedDamagedIdsMap({});
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

  // Initialize actual quantities from delivered quantities
  useEffect(() => {
    if (!selectedDeliveryRequest) return;

    if (selectedDeliveryRequest.actualDeliveryTime) {
      setCompletionDate(parseDate(selectedDeliveryRequest.actualDeliveryTime));
    }

    setDeliveryReturnedFreshQuantities({});
    setDeliveryReturnedSoiledQuantities({});
    setDeliveryReturnedDamagedQuantities({});
    setDeliveryReturnedFreshIdsMap({});
    setDeliveryReturnedSoiledIdsMap({});
    setDeliveryReturnedDamagedIdsMap({});

    const initQty = {};
    selectedDeliveryRequest.productItems.forEach((item) => {
      const productName = item.productName;
      initQty[productName] = (initQty[productName] || 0) + item.deliveredQuantity;
    });
    setActualQuantities(initQty);
  }, [selectedDeliveryRequest]);

  // Auto-compute delivery inventory IDs — remove returned IDs from expected
  useEffect(() => {
    if (!selectedDeliveryRequest) return;

    const expectedIds = {};
    selectedDeliveryRequest.productItems.forEach((item) => {
      const productName = item.productName;
      if (!expectedIds[productName]) expectedIds[productName] = [];
      const itemIds = (item.items || [])
        .map((it) => (typeof it === "object" ? (it.inventoryItemId ?? it.referenceId ?? it.id) : it))
        .filter(Boolean);
      expectedIds[productName].push(...itemIds);
    });

    const newActualIds = {};
    for (const [productName, ids] of Object.entries(expectedIds)) {
      const freshIds = new Set(deliveryReturnedFreshIdsMap[productName] || []);
      const soiledIds = new Set(deliveryReturnedSoiledIdsMap[productName] || []);
      const damagedIds = new Set(deliveryReturnedDamagedIdsMap[productName] || []);
      newActualIds[productName] = ids
        .filter((id) => !freshIds.has(id) && !soiledIds.has(id) && !damagedIds.has(id));
    }

    setDeliveryInventoryIdsMap(newActualIds);
  }, [
    selectedDeliveryRequest,
    deliveryReturnedFreshIdsMap,
    deliveryReturnedSoiledIdsMap,
    deliveryReturnedDamagedIdsMap,
  ]);

  const buildDeliveryScannedItems = (productName, deliveredAt, noteText) => {
    const buildEntries = (inventoryIds = []) =>
      inventoryIds.map((inventoryItemId) => ({
        inventoryItemId,
        notes: noteText,
        deliveredAt,
      }));

    return [
      ...figureOutDDeliveryItemStatus(
        buildEntries(deliveryInventoryIdsMap[productName]),
        "OVERALL",
      ),
      ...figureOutDDeliveryItemStatus(
        buildEntries(deliveryReturnedFreshIdsMap[productName]),
        "RETURNED_FRESH",
      ),
      ...figureOutDDeliveryItemStatus(
        buildEntries(deliveryReturnedSoiledIdsMap[productName]),
        "RETURNED_SOILED",
      ),
      ...figureOutDDeliveryItemStatus(
        buildEntries(deliveryReturnedDamagedIdsMap[productName]),
        "RETURNED_DAMAGED",
      ),
    ];
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (!selectedDeliveryRequest || !selectedVisitId || !selectedTripId) {
      showSnackbar("Missing required data.", "error");
      setIsSaving(false);
      return;
    }

    const productItems = Object.entries(
      selectedDeliveryRequest.productItems.reduce((acc, item) => {
        const productName = item.productName;
        if (!acc[productName]) {
          acc[productName] = {
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            expectedQuantity: 0,
            deliveredQuantity: actualQuantities[productName] || 0,
            returnedDamagedQuantity: deliveryReturnedDamagedQuantities[productName] || 0,
            returnedSoiledQuantity: deliveryReturnedSoiledQuantities[productName] || 0,
            returnedFreshQuantity: deliveryReturnedFreshQuantities[productName] || 0,
            notes: "Delivered",
            items: [],
          };
        }
        acc[productName].expectedQuantity += item.expectedQuantity;
        return acc;
      }, {}),
    ).map(([, productData]) => ({
      ...productData,
      items: buildDeliveryScannedItems(
        productData.productName,
        parseDate(completionDate).toISOString(),
        "Delivered",
      ),
    }));

    const completionData = {
      notes,
      deliveryRequests: [
        {
          id: selectedDeliveryRequest.id,
          requestId: selectedDeliveryRequest.id,
          notes,
          actualDeliveryTime: parseDate(completionDate).toISOString(),
          challanUrl: selectedDeliveryRequest.challanUrl || null,
          challanNumber: selectedDeliveryRequest.challanNumber || null,
          productItems,
        },
      ],
    };

    try {
      await tripService.completeDeliveryRequest(
        selectedTripId,
        selectedVisitId,
        completionData,
      );
      showSnackbar("Delivery request completed successfully!", "success");
      await handleClose();
      fetchTrips();
    } catch (error) {
      console.error("Error completing delivery request:", error);
      showSnackbar(
        error?.response?.data?.message ||
        "Failed to complete delivery request.",
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
      console.error("Failed to cancel scanner session on delivery dialog close", e);
    } finally {
      onClose();
    }
  };

  const makeScanHandler = (quantityType, setQuantities, setIdsMap) => (msg) => {

    if (msg.event === "SCAN_COMPLETE" && msg.results?.items) {
      msg.results.items.forEach((scannedItem) => {
        const deliveryItem = selectedDeliveryRequest?.productItems?.find(
          (item) => item.productId === scannedItem.productId
        );

        if (deliveryItem) {
          const productName = deliveryItem.productName;

          setQuantities((prev) => ({
            ...prev,
            [productName]: (prev[productName] || 0) + 1,
          }));
          setIdsMap((prev) => {
            const existing = prev[productName] || [];
            if (existing.includes(scannedItem.inventoryItemId)) return prev;
            return {
              ...prev,
              [productName]: [...existing, scannedItem.inventoryItemId],
            };
          });
        }

        setScannedCount((c) => c + 1);
        setScanPreview((prev) => [
          {
            id: scannedItem.inventoryItemId,
            productName: scannedItem.productName,
            scanType: "DELIVERY_COMPLETED",
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
      <DialogTitle>Complete Delivery Request</DialogTitle>
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
        {selectedDeliveryRequest && (
          <React.Fragment>
            <Typography variant="body2">
              <strong>Order ID:</strong> {selectedDeliveryRequest.id}
            </Typography>
            <Typography variant="body2">
              <strong>Customer Name:</strong>{" "}
              {
                tripDetails.visits.find(
                  (v) => v.id === selectedDeliveryRequest.visitId,
                )?.customerName
              }
            </Typography>
            {selectedDeliveryRequest.challanUrl && (
              <Typography variant="body2">
                <strong>Challan:</strong> {selectedDeliveryRequest.challanNumber || "N/A"} (
                <a
                  href={selectedDeliveryRequest.challanUrl}
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

              label="Actual Delivery Time"
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
                    <TableCell sx={{ width: '20%' }}>
                      <strong>Product Name</strong>
                    </TableCell>
                    <TableCell align="center" sx={{ width: '13.3%' }}>
                      <strong>Expected Qty</strong>
                    </TableCell>
                    <TableCell align="left" sx={{ width: '17.8%' }}>
                      <strong>Actual Qty</strong>
                    </TableCell>
                    <TableCell align="center" sx={{ width: '17.8%' }}>
                      <ColumnScanHeaderAction
                        label="Returned Fresh Qty"
                        quantityType="RETURNED_FRESH"
                        referenceId={selectedDeliveryRequest?.id}
                        scanType="DELIVERY_COMPLETED"
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                        onScanMessage={makeScanHandler(
                          "RETURNED_FRESH",
                          setDeliveryReturnedFreshQuantities,
                          setDeliveryReturnedFreshIdsMap,
                        )}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ width: '17.8%' }}>
                      <ColumnScanHeaderAction
                        label="Returned Soiled Qty"
                        quantityType="RETURNED_SOILED"
                        referenceId={selectedDeliveryRequest?.id}
                        scanType="DELIVERY_COMPLETED"
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                        onScanMessage={makeScanHandler(
                          "RETURNED_SOILED",
                          setDeliveryReturnedSoiledQuantities,
                          setDeliveryReturnedSoiledIdsMap,
                        )}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ width: '17.8%' }}>
                      <ColumnScanHeaderAction
                        label="Returned Damaged Qty"
                        quantityType="RETURNED_DAMAGED"
                        referenceId={selectedDeliveryRequest?.id}
                        scanType="DELIVERY_COMPLETED"
                        onScanStart={(ctx) => {
                          setActiveScan(ctx);
                          setScanStatus("ACTIVE");
                        }}
                        onScanStop={() => {
                          setActiveScan(null);
                          setScanStatus("IDLE");
                        }}
                        onScanMessage={makeScanHandler(
                          "RETURNED_DAMAGED",
                          setDeliveryReturnedDamagedQuantities,
                          setDeliveryReturnedDamagedIdsMap,
                        )}
                      />
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(
                    selectedDeliveryRequest.productItems.reduce(
                      (acc, item) => {
                        const productName = item.productName;
                        if (!acc[productName]) {
                          acc[productName] = {
                            expectedQuantity: 0,
                            deliveredQuantity: 0,
                            items: [],
                          };
                        }
                        acc[productName].expectedQuantity +=
                          item.expectedQuantity;
                        acc[productName].deliveredQuantity +=
                          item.deliveredQuantity ?? item.actualQuantity ?? 0;
                        acc[productName].items.push(item);
                        return acc;
                      },
                      {},
                    ),
                  ).map(([productName, { expectedQuantity, items }]) => (
                    <TableRow key={productName}>
                      <TableCell>{productName}</TableCell>
                      <TableCell
                        variant="scan"
                        value={expectedQuantity}
                        editable={false}
                        inventoryItemIds={
                          items.flatMap((it) =>
                            (it.items || [])
                              .map((x) => (typeof x === "object" ? (x.inventoryItemId ?? x.referenceId ?? x.id) : x))
                              .filter(Boolean)
                          )
                        }
                      />
                      <TableCell
                        variant="scan"
                        value={actualQuantities[productName]}
                        inventoryItemIds={deliveryInventoryIdsMap[productName] || []}
                        onChange={(val) => {
                          setActualQuantities((prev) => ({
                            ...prev,
                            [productName]: val,
                          }));
                        }}
                      />
                      <TableCell
                        variant="scan"
                        value={deliveryReturnedFreshQuantities[productName] || 0}
                        quantityType="RETURNED_FRESH"
                        referenceId={selectedDeliveryRequest?.id}
                        scanType="DELIVERY_COMPLETED"
                        productId={productName}
                        inventoryItemIds={deliveryReturnedFreshIdsMap[productName] || []}
                        onChange={(val) => {
                          setDeliveryReturnedFreshQuantities((prev) => ({
                            ...prev,
                            [productName]: val,
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
                        value={deliveryReturnedSoiledQuantities[productName] || 0}
                        quantityType="RETURNED_SOILED"
                        referenceId={selectedDeliveryRequest?.id}
                        scanType="DELIVERY_COMPLETED"
                        productId={productName}
                        inventoryItemIds={deliveryReturnedSoiledIdsMap[productName] || []}
                        onChange={(val) => {
                          setDeliveryReturnedSoiledQuantities((prev) => ({
                            ...prev,
                            [productName]: val,
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
                        value={deliveryReturnedDamagedQuantities[productName] || 0}
                        quantityType="RETURNED_DAMAGED"
                        referenceId={selectedDeliveryRequest?.id}
                        scanType="DELIVERY_COMPLETED"
                        productId={productName}
                        inventoryItemIds={deliveryReturnedDamagedIdsMap[productName] || []}
                        onChange={(val) => {
                          setDeliveryReturnedDamagedQuantities((prev) => ({
                            ...prev,
                            [productName]: val,
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
              multiline
              sx={{ mt: 2 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </React.Fragment>
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
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CompleteDeliveryDialog;
