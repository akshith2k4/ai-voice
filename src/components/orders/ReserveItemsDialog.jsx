import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableBody,
  Paper,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import TableCell from "../common/TableCell";
import { inventoryService } from "../../services/inventoryService";
import CustomSnackbar from "../layout/CustomSnackbar";
import ScannerHeader from "../Scanner/ScannerHeader";
import ColumnScanHeaderAction from "../Scanner/ColumnScanHeaderAction";
import { scannerController } from "../Scanner/ScannerController";
import { normalizeQuantity } from "../../utils/quantityUtils";

const ReserveItemsDialog = ({
  open,
  onClose,
  deliveryItems,
  customerId,
  orderId,
}) => {
  const [populatedQuantities, setPopulatedQuantities] = useState({});
  const [inventoryIdsMap, setInventoryIdsMap] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  //scan variables
  const [scanStatus, setScanStatus] = useState("IDLE");
  const [scanPreview, setScanPreview] = useState([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [activeScan, setActiveScan] = useState(null);
  const [showScannerHeader, setShowScannerHeader] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetReserveDialogState = () => {
    setPopulatedQuantities({});
    setInventoryIdsMap({});
    setScanStatus("IDLE");
    setScanPreview([]);
    setScannedCount(0);
    setActiveScan(null);
    setShowScannerHeader(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleClose = async () => {
    try {
      await scannerController.cancel();
    } catch (e) {
      console.error("Failed to cancel scanner session", e);
    } finally {
      resetReserveDialogState();
      onClose();
    }
  };

  useEffect(() => {
    if (open) {
      resetReserveDialogState();
    }
  }, [open]);

  useEffect(() => {
    if (scanStatus === "ACTIVE") {
      setShowScannerHeader(true);
    }
  }, [scanStatus]);

  const handleReserveClick = async () => {
    if (!orderId || !deliveryItems) {
      setSnackbar({
        open: true,
        message: "Missing orderId or deliveryItems.",
        severity: "error",
      });
      return;
    }

    setIsSaving(true);

    const requestData = {
      orderId,
      packedAt: new Date().toISOString(),
      items: deliveryItems
        .filter((item) => {
          const scannedQuantity = populatedQuantities[item.productId];
          return scannedQuantity && normalizeQuantity(scannedQuantity) > 0;
        })
        .map((item) => {
          const scannedQuantity = populatedQuantities[item.productId];

          return {
            productId: item.productId,
            quantity: normalizeQuantity(scannedQuantity),
            inventoryItemIds: inventoryIdsMap[item.productId] || [],
          };
        }),
    };

    try {
      const response =
       await inventoryService.saveOrderPacking(requestData);
      console.log("Packing successful:", response);
      setSnackbar({
        open: true,
        message: "Packing saved successfully.",
        severity: "success",
      });
      await handleClose();
    } catch (error) {
      console.error("Error saving packing:", error);
      setSnackbar({
        open: true,
        message: "Failed to save packing.",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };
  //scan
  const handleScanStart = () => {
    setShowScannerHeader(true);
    setScanStatus("ACTIVE");
  };

  const handleScanStop = () => {
    setScanStatus("IDLE");
  };
  const handleScanMessage = (data) => {
    console.log("📨 ReserveItemsDialog received scan data:", data);

    if (!data) {
      console.warn("⚠️ No data received");
      return;
    }

    // Handle SCAN_COMPLETE event from WebSocket
    if (data.event === "SCAN_COMPLETE" && data.results?.items) {
      console.log("✅ Processing SCAN_COMPLETE event with items:", data.results.items);

      data.results.items.forEach((item) => {
        console.log("🔄 Processing item:", item);

        const inventoryId = item.inventoryItemId;
        const scannedProductId = item.productId;

        if (!inventoryId || !scannedProductId) {
          console.warn("⚠️ Missing inventoryId or productId");
          return;
        }

        const productExists = deliveryItems?.some(
          (deliveryItem) => deliveryItem.productId === scannedProductId,
        );

        if (!productExists) {
          console.warn(`⚠️ Product ${scannedProductId} not in delivery items`);
          return; // ignore unrelated scans
        }

        console.log(`✅ Adding inventory ${inventoryId} for product ${scannedProductId}`);

        setInventoryIdsMap((prev) => {
          const existing = prev[scannedProductId] || [];
          if (existing.includes(inventoryId)) {
            console.log(`ℹ️ Inventory ${inventoryId} already scanned`);
            return prev;
          }

          return {
            ...prev,
            [scannedProductId]: [...existing, inventoryId],
          };
        });

        // preview update
        setScanPreview((prev) => [
          ...prev,
          {
            id: inventoryId,
            productName: item.productName || "Scanned Item",
            scanType: "ORDER_PACKING",
            quantityType: "OVERALL",
          },
        ]);

        setScannedCount((prev) => prev + 1);

        setPopulatedQuantities((prev) => ({
          ...prev,
          [scannedProductId]: (prev[scannedProductId] || 0) + 1,
        }));
      });
    } else {
      // Handle legacy single item format (if still used elsewhere)
      console.log("⚠️ Received data in legacy format");

      const inventoryId = data.inventoryItemId;
      const scannedProductId = data.productId;

      if (!inventoryId || !scannedProductId) return;

      const productExists = deliveryItems?.some(
        (item) => item.productId === scannedProductId,
      );

      if (!productExists) return; // ignore unrelated scans

      setInventoryIdsMap((prev) => {
        const existing = prev[scannedProductId] || [];
        if (existing.includes(inventoryId)) return prev;

        return {
          ...prev,
          [scannedProductId]: [...existing, inventoryId],
        };
      });

      // preview update
      setScanPreview((prev) => [
        ...prev,
        {
          id: inventoryId,
          productName: data.productName || "Scanned Item",
          scanType: "ORDER_PACKING",
          quantityType: "OVERALL",
        },
      ]);

      setScannedCount((prev) => prev + 1);
      setPopulatedQuantities((prev) => ({
        ...prev,
        [scannedProductId]: (prev[scannedProductId] || 0) + 1,
      }));
    }
  };

  const allInventoryIds = Object.values(inventoryIdsMap).flat();

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            Fufillment Packing
          </Box>
        </DialogTitle>

        <DialogContent sx={{ overflowX: "hidden" }}>
          {showScannerHeader && (
            <Box sx={{ mb: 2 }}>
              <ScannerHeader
                status={scanStatus}
                scannedCount={scannedCount}
                scanPreview={scanPreview}
                onCancel={resetReserveDialogState}
              />
            </Box>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="center">
                    <ColumnScanHeaderAction
                      label="Scan Quantity"
                      quantityType="OVERALL"
                      referenceId={orderId}
                      scanType="ORDER_PACKING"
                      disabled={!orderId || !deliveryItems?.length}
                      onScanStart={handleScanStart}
                      onScanStop={handleScanStop}
                      onScanMessage={handleScanMessage}
                      inventoryItemIds={allInventoryIds}
                    />
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {(deliveryItems || []).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell
                      variant="scan"
                      align="center"
                      value={populatedQuantities[item.productId] || 0}
                      quantityType="OVERALL"
                      referenceId={orderId}
                      productId={item.productId}
                      scanType="ORDER_PACKING"
                      onChange={(val) => {
                        setPopulatedQuantities((prev) => ({
                          ...prev,
                          [item.productId]: Number(val),
                        }));
                      }}
                      onScanStart={(ctx) => {
                        setActiveScan(ctx);
                        setScanStatus("ACTIVE");
                        setScanPreview([]);
                        setScannedCount(0);
                      }}
                      onScanStop={() => {
                        setActiveScan(null);
                        setScanStatus("IDLE");
                      }}
                      onScanMessage={handleScanMessage}
                      inventoryItemIds={inventoryIdsMap[item.productId] || []}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleReserveClick}
            variant="contained"
            color="primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Reserve"}
          </Button>
        </DialogActions>
      </Dialog>

      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleSnackbarClose}
      />
    </>
  );
};

export default ReserveItemsDialog;
