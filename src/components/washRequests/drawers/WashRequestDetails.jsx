import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LaundryProgress from "./LaundryProgress.jsx";
import { washRequestService } from "../../../services/washRequestService.jsx";
import { washFulfillmentService } from "../../../services/washFulfillmentService.jsx";
import { DATE_TIME, formatCustomDate } from "../../../utils/dateUtils.js";
import { getStatusChipColor } from "../../../utils/statusUtils.js";
import { transformWashRequestAndFulfillment } from "../../../utils/washRequestTransformers.js";
import TableCell from "../../common/TableCell";

const getSoiledItemRefs = (productRow) => {
  const soiledItems = Array.isArray(productRow?.soiledItems)
    ? productRow.soiledItems
    : [];

  return soiledItems
    .map((entry) => entry?.referenceId ?? entry?.inventoryItemId ?? entry?.id)
    .filter((value) => value !== null && value !== undefined);
};

const getSoiledItemsTooltipTitle = (productRow) => {
  const refs = getSoiledItemRefs(productRow);
  return refs.length > 0 ? refs.join(", ") : "No inventory items";
};

function WashRequestDetails({ request, onClose }) {
  const [isDownloadingDC, setIsDownloadingDC] = useState(false);
  const [fulfillmentData, setFulfillmentData] = useState(null);
  const [isFulfillmentLoading, setIsFulfillmentLoading] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState(null);

  const downloadDeliveryChallan = async () => {
    if (!request?.id) return;
    try {
      setIsDownloadingDC(true);
      const deliveryChallan = await washRequestService.getDeliveryChallanUrl(request?.id);
      const url = deliveryChallan;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        console.error("Delivery challan URL not found in response:", deliveryChallan);
        alert("Delivery Challan URL is not available for this request.");
      }
    } catch (err) {
      console.error("Failed to fetch Delivery Challan URL", err);
      alert("Failed to get Delivery Challan URL. Please try again.");
    } finally {
      setIsDownloadingDC(false);
    }
  };

  useEffect(() => {
    const id = request?.id;
    console.log("[useEffect] triggered for washRequest id:", id);

    if (!id) {
      setFulfillmentData(null);
      setIsFulfillmentLoading(false);
      setFulfillmentError(null);
      return;
    }

    let mounted = true;
    setIsFulfillmentLoading(true);
    setFulfillmentError(null);

    const fetchFulfillment = async () => {
      try {
        console.log("[fetchFulfillment] calling service for id:", id);
        const data = await washFulfillmentService.getFulfillmentsSummaryByWashRequestId(id);
        console.log("[fetchFulfillment] service returned:", data);

        if (!data) {
          throw new Error("Empty payload from fulfillment service");
        }

        if (mounted) {
          setFulfillmentData(data);
          console.log("[fetchFulfillment] setFulfillmentData -> OK");
        }
      } catch (err) {
        console.error("[fetchFulfillment] error:", err, "err.response?", err?.response);
        if (mounted) setFulfillmentError(err?.message ?? "Failed to load fulfillments");
      } finally {
        if (mounted) setIsFulfillmentLoading(false);
      }
    };

    fetchFulfillment();

    return () => {
      mounted = false;
      console.log("[useEffect] cleanup for id:", id);
    };
  }, [request?.id]);

  const { washRequestTransformed, fulfillmentSummaryTransformed } = useMemo(() => {
    // Short-circuit guards to avoid calling transformer with null/undefined fulfillmentData
    if (!request && !fulfillmentData) {
      return { washRequestTransformed: null, fulfillmentSummaryTransformed: null };
    }

    if (request && !fulfillmentData) {
      // We don't have fulfillment yet — return a safe shallow copy so UI can render.
      return { washRequestTransformed: { ...request }, fulfillmentSummaryTransformed: null };
    }

    if (!request && fulfillmentData) {
      // Unlikely, but handle it: return fulfillment copy
      return { washRequestTransformed: null, fulfillmentSummaryTransformed: { ...fulfillmentData } };
    }

    // Both present — call transform inside try/catch
    try {
      return transformWashRequestAndFulfillment(request, fulfillmentData);
    } catch (e) {
      console.error("transformWashRequestAndFulfillment failed:", e);
      return {
        washRequestTransformed: request ? { ...request } : null,
        fulfillmentSummaryTransformed: fulfillmentData ? { ...fulfillmentData } : null,
      };
    }
  }, [request, fulfillmentData]);

  useEffect(() => {
    console.log("WashRequest Transformed:", washRequestTransformed);
    console.log("FulfillmentSummary Transformed:", fulfillmentSummaryTransformed);
  }, [washRequestTransformed, fulfillmentSummaryTransformed]);

  console.log(isFulfillmentLoading, fulfillmentError);

  if (!request?.id) return null;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
      }}
    >
      <Box
        sx={{
          p: 2,
          px: 3,
          borderBottom: 1,
          borderColor: "#e0e0e0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#1a1a1a" }}
        >
          Wash Request Details
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "#757575", "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" } }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: "auto", px: 3, py: 2 }}>
        <List disablePadding>
          <ListItem disableGutters>
            <ListItemText
              primary={
                <Typography variant="subtitle1" sx={{ color: "#2e7d32", fontWeight: 600, mb: 1 }}>
                  Wash Request Information
                </Typography>
              }
              secondary={
                <Box>
                  <Typography variant="body2" component="div">
                    <strong>Request Number:</strong> {request.requestNumber ?? "—"}
                  </Typography>
                  <Typography variant="body2" component="div">
                    <strong>Vendor:</strong> {request.laundryVendorName ?? "N/A"}
                  </Typography>
                  <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }} component="div">
                    <strong>Status:</strong>
                    <Chip
                      label={request.status ?? "—"}
                      size="small"
                      color={getStatusChipColor(request.status)}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="body2" component="div">
                    <strong>Reference:</strong>{" "}
                    {(request.referenceType || "—") +
                      (request.referenceId ? ` (#${request.referenceId})` : "")}
                  </Typography>
                  {/* <Typography variant="body2" component="div">
                    <strong>Created Date:</strong> {formatCustomDate(request.createdDate, DATE_TIME)}
                  </Typography> */}
                  <Typography variant="body2" component="div">
                    <strong>Recorded Time:</strong> {formatCustomDate(request.washRequestRecordedDateTime, DATE_TIME)}
                  </Typography>
                  <Typography variant="body2" component="div">
                    <strong>Actual Wash Time:</strong> <strong>{formatCustomDate(request.actualFulfillmentTime, DATE_TIME)}</strong>
                  </Typography>
                  <Typography variant="body2" component="div">
                    <strong>Notes:</strong> {request.notes || "—"}
                  </Typography>
                </Box>
              }
              secondaryTypographyProps={{ component: "div" }}
            />
          </ListItem>

          <Divider sx={{ my: 1.5 }} />

          <ListItem disableGutters>
            <ListItemText
              primary={
                <Typography variant="subtitle1" sx={{ color: "#2e7d32", fontWeight: 600, mb: 1 }}>
                  Wash Efficiency
                </Typography>
              }
              secondary={
                <LaundryProgress washRequestData={washRequestTransformed} />
              }
              secondaryTypographyProps={{ component: "div" }}
            />
          </ListItem>

          <Divider sx={{ my: 1.5 }} />

          <ListItem disableGutters>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ color: "#2e7d32", fontWeight: 600 }}>
                    Product Summary
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={downloadDeliveryChallan}
                    disabled={isDownloadingDC || !(request?.id ?? request?.washRequestId)}
                  >
                    {isDownloadingDC ? (
                      <>
                        <CircularProgress size={16} sx={{ mr: 1 }} /> Downloading…
                      </>
                    ) : (
                      "Download DC"
                    )}
                  </Button>
                </Box>
              }
              secondary={
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" sx={{ tableLayout: 'fixed' }} aria-label="Product summary">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '30%' }}>Product</TableCell>
                        <TableCell align="center" sx={{ width: '17.5%' }}>Soil sent</TableCell>
                        <TableCell align="center" sx={{ width: '17.5%' }}>Total rcvd.</TableCell>
                        <TableCell align="center" sx={{ width: '17.5%' }}>Soil rcvd.</TableCell>
                        <TableCell align="center" sx={{ width: '17.5%' }}>Damage rcvd.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(washRequestTransformed?.productSoiledItems?.length ?? 0) > 0 ? (
                        washRequestTransformed.productSoiledItems.map((r) => (
                          <TableRow key={r.productId ?? r.key ?? r.productName}>
                            <TableCell>
                              {r.productName}
                            </TableCell>
                            <TableCell
                              variant="scan"
                              value={r.soiledQuantitySent}
                              editable={false}
                              inventoryItemIds={getSoiledItemRefs(r)}
                            />
                            <TableCell align="center">{r.totalWashedQuantityReceived}</TableCell>
                            <TableCell align="center">{r.soiledQuantityReceived}</TableCell>
                            <TableCell align="center">{r.damagedQuantityReceived}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No products.
                          </TableCell>
                        </TableRow>
                      )}

                      {washRequestTransformed?.productSoiledItemsTotal && (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {washRequestTransformed.productSoiledItemsTotal.soiledQuantitySentTotal}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {washRequestTransformed.productSoiledItemsTotal.totalWashedQuantityReceivedTotal}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {washRequestTransformed.productSoiledItemsTotal.soiledQuantityReceivedTotal}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {washRequestTransformed.productSoiledItemsTotal.damagedQuantityReceivedTotal}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              }
              secondaryTypographyProps={{ component: "div" }}
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
}

export default WashRequestDetails;
