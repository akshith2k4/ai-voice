import React from "react";
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
  Tooltip,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import TableCell from "../common/TableCell";
import {
  Close as CloseIcon,
  LocalShipping as DeliveryIcon,
  ShoppingBasket as PickupIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import ReserveItemsDialog from "./ReserveItemsDialog";
import RejectItemsDialog from "./RejectItemsDialog";
import { orderService } from "../../services/orderService";
import { packingJobService } from "../../services/packingJobService";
import { laundryUserService } from "../../services/laundryUserService";
import VisitImagesDialog from "../trips/VisitImagesDialog";
import CustomSnackbar from "../layout/CustomSnackbar";
import { formatCustomDate } from "../../utils/dateUtils";
import CustomDrawer from "../common/CustomDrawer";
import GlowingDot from "../common/GlowingDot";
import { LEASING_ORDER_CATEGORY } from "../../constants/orderConstants";

// Recalculate rejected quantities based on APPROVED rejection requests
const recalcRejectedQuantities = (deliveryItems, rejectionRequests) => {
  return (deliveryItems || []).map((item) => {
    const approvedRejectedQuantity = (rejectionRequests || [])
      .filter(
        (request) =>
          request.productId === item.productId && request.status === "APPROVED",
      )
      .reduce((sum, request) => sum + request.quantity, 0);

    return {
      ...item,
      rejectedQuantity: approvedRejectedQuantity,
    };
  });
};
// Cost calculation
const calculateItemsCost = (items) =>
  (items || []).reduce(
    (sum, item) => sum + item.quantity * (item.unitPrice || 0),
    0,
  );

// Get combined order and fulfillment status
const getCombinedStatus = (order) => {
  const orderStatus = order?.status;
  const fulfillmentStatus = order?.leasingOrderDetails?.orderFulfillment?.status;
  if (orderStatus === "COMPLETED") {
    return "COMPLETED";
  }
  if (fulfillmentStatus === "INVENTORY_PACKED") {
    return "PACKED";
  }
  return orderStatus || "PENDING";
};

const getStatusColor = (status) => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PACKED":
    case "IN_PROGRESS":
      return "info";
    case "PENDING":
      return "warning";
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
};

/* ================= COMPONENT ================= */



function OrderDetailSidebar({ open, order, onClose, onUpdateOrder }) {
  if (!order) return null;

  if (!onUpdateOrder) {
    console.error("OrderDetails requires onUpdateOrder prop");
    return null;
  }

  const customerId = order.customerId;
  const leasingDetails = order.leasingOrderDetails || {};
  const rejectionRequests = leasingDetails.rejectionRequests || [];
  const deliveryItems = leasingDetails.deliveryItems || [];

  const rentalDetails = order.rentalOrderDetails || {};
  const washingDetails = order.washingOrderDetails || {};

  const deliveryTotal = calculateItemsCost(leasingDetails.deliveryItems);
  const pickupTotal = calculateItemsCost(leasingDetails.pickupItems);
  const subtotal = deliveryTotal + pickupTotal;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  /* ================= DIALOG STATE ================= */

  const [reserveDialogOpen, setReserveDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);


  const [isCompletingApi, setIsCompletingApi] = React.useState(false);

  /* ================= SNACKBAR STATE ================= */

  const [orderSnackbarOpen, setOrderSnackbarOpen] = React.useState(false);
  const [orderSnackbarMessage, setOrderSnackbarMessage] = React.useState("");
  const [orderSnackbarSeverity, setOrderSnackbarSeverity] =
    React.useState("info");

  const showOrderDetailsSnackbar = (message, severity = "info") => {
    setOrderSnackbarMessage(message);
    setOrderSnackbarSeverity(severity);
    setOrderSnackbarOpen(true);
  };

  const closeOrderDetailsSnackbar = () => {
    setOrderSnackbarOpen(false);
  };

  /* ================= PACKING JOB STATE & ACTIONS ================= */

  const [packingJob, setPackingJob] = React.useState(null);
  const [loadingPackingJob, setLoadingPackingJob] = React.useState(false);
  const [isCreatingPackingJob, setIsCreatingPackingJob] = React.useState(false);

  React.useEffect(() => {
    const fetchPackingJob = async () => {
      const fulfillmentId = order?.leasingOrderDetails?.orderFulfillment?.id;
      if (open && fulfillmentId) {
        setLoadingPackingJob(true);
        try {
          const job = await packingJobService.getJobBySource("ORDER_FULFILLMENT", fulfillmentId);
          setPackingJob(job);
        } catch (error) {
          console.log("No packing job found for order fulfillment:", fulfillmentId);
          setPackingJob(null);
        } finally {
          setLoadingPackingJob(false);
        }
      } else {
        setPackingJob(null);
      }
    };
    fetchPackingJob();
  }, [open, order]);

  const handleCreatePackingJob = async () => {
    const fulfillmentId = order?.leasingOrderDetails?.orderFulfillment?.id;
    if (!fulfillmentId) {
      showOrderDetailsSnackbar("No order fulfillment ID found to create packing job.", "error");
      return;
    }

    setIsCreatingPackingJob(true);
    try {
      const productItems = (order.leasingOrderDetails?.deliveryItems || [])
        .map((item) => {
          const packingQuantity =
            item.packingQuantity != null
              ? Number(item.packingQuantity)
              : Number(item.quantity || 0) -
              Number(item.completedQuantity || 0) -
              Number(item.rejectedQuantity || 0);

          return {
            referenceItemType: "LEASING_ORDER_DELIVERY_ITEM",
            referenceItemId: String(item.id ?? item.productId),
            productId: item.productId,
            packingQuantity,
            notes: item.remarks || "",
          };
        })
        .filter((item) => item.packingQuantity > 0);

      if (productItems.length === 0) {
        showOrderDetailsSnackbar("No products with a positive packing quantity found.", "warning");
        return;
      }

      const payload = {
        referenceType: "ORDER_FULFILLMENT",
        referenceId: String(fulfillmentId),
        notes: order.notes || "",
        productItems,
      };

      const newJob = await packingJobService.createJob(payload);
      setPackingJob(newJob);
      showOrderDetailsSnackbar(`Packing job created successfully! Job Number: ${newJob.jobNumber}`, "success");
    } catch (error) {
      console.error("Failed to create packing job:", error);
      const errMsg = error?.response?.data?.message || error?.message || "Failed to create packing job.";
      showOrderDetailsSnackbar(`Failed to create packing job: ${errMsg}`, "error");
    } finally {
      setIsCreatingPackingJob(false);
    }
  };

  /* ================= ACTIONS ================= */

  // COMPLETE ORDER
  // ================= COMPLETE ORDER =================
  const handleOrderComplete = async () => {
    try {
      setIsCompletingApi(true);

      const completedAt = new Date().toISOString();

      await orderService.recordCompleteOrder(
        order.referenceNumber,
        completedAt,
      );

      showOrderDetailsSnackbar(
        "Order marked as completed successfully!",
        "success",
      );

      // close sidebar after success
      onClose?.();
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to complete the order.";

      alert(`Failed to complete the order: ${backendMessage}`);
    } finally {
      setIsCompletingApi(false);
    }
  };

  // ================= APPROVE REJECTION =================
  const handleRejectRequestApprove = async (rejectionRequest) => {
    if (rejectionRequest.status === "APPROVED") return;

    const userConfirmed = window.confirm(
      "Are you sure you want to approve this rejection request?",
    );
    if (!userConfirmed) return;

    try {
      await orderService.updateRejectionRequestStatus(
        rejectionRequest.id,
        "APPROVED",
      );

      const updatedRejections = rejectionRequests.map((r) =>
        r.id === rejectionRequest.id ? { ...r, status: "APPROVED" } : r,
      );

      onUpdateOrder({
        ...order,
        leasingOrderDetails: {
          ...order.leasingOrderDetails,
          rejectionRequests: updatedRejections,
          deliveryItems: recalcRejectedQuantities(
            order.leasingOrderDetails.deliveryItems,
            updatedRejections,
          ),
        },
      });

      showOrderDetailsSnackbar(
        "Rejection request approved successfully",
        "success",
      );
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to approve rejection request.";

      alert(`Failed to approve rejection request: ${backendMessage}`);
    }
  };

  // ================= DELETE REJECTION =================
  const handleRejectRequestDelete = async (rejectionRequest) => {
    const userConfirmed = window.confirm(
      "Are you sure you want to delete this rejection request?",
    );
    if (!userConfirmed) return;

    try {
      await orderService.deleteRejectionRequest(rejectionRequest.id);

      const updatedRejections = rejectionRequests.filter(
        (r) => r.id !== rejectionRequest.id,
      );

      onUpdateOrder({
        ...order,
        leasingOrderDetails: {
          ...order.leasingOrderDetails,
          rejectionRequests: updatedRejections,
          deliveryItems: recalcRejectedQuantities(
            order.leasingOrderDetails.deliveryItems,
            updatedRejections,
          ),
        },
      });

      showOrderDetailsSnackbar(
        "Rejection request deleted successfully",
        "success",
      );
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete rejection request.";

      alert(`Failed to delete rejection request: ${backendMessage}`);
    }
  };

  // ================= CREATE REJECTION =================
  const handleRejectRequestCreated = (createdRejection) => {
    const updatedRejections = [...rejectionRequests, createdRejection];

    onUpdateOrder({
      ...order,
      leasingOrderDetails: {
        ...order.leasingOrderDetails,
        rejectionRequests: updatedRejections,
        deliveryItems: recalcRejectedQuantities(
          order.leasingOrderDetails.deliveryItems,
          updatedRejections,
        ),
      },
    });

    showOrderDetailsSnackbar(
      "Rejection request created successfully!",
      "success",
    );
  };

  // ======================= RENDER =======================
  return (
    <CustomDrawer open={open} onClose={onClose} width={700}>
      <Box sx={{ px: 3, py: 2, overflowY: "auto" }}>
        <Box
          sx={{
            pb: 1,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Order Details
          </Typography>

          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            py: 1,
          }}
        >
          <List disablePadding>
            {/* BASIC ORDER INFO */}
            <ListItem disablePadding>
              <ListItemText
                primary={
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "success.dark", fontWeight: 500, mb: 1 }}
                  >
                    Order Information
                  </Typography>
                }
                secondary={
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      mt: 1,
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" color="text.primary">
                      <strong>Reference Number:</strong> {order.referenceNumber}
                    </Typography>

                    <Typography variant="body2" color="text.primary">
                      <strong>Customer Name:</strong> {order.customerName}
                    </Typography>

                    <Typography variant="body2" color="text.primary">
                      <strong>Ordered Date:</strong>{" "}
                      {formatCustomDate(order.orderDate)}
                    </Typography>

                    <Typography variant="body2" color="text.primary">
                      <strong>Type:</strong>{" "}
                      <Chip
                        size="small"
                        icon={
                          order.orderType === "DELIVERY" ? (
                            <DeliveryIcon />
                          ) : (
                            <PickupIcon />
                          )
                        }
                        label={order.orderType}
                        sx={{ ml: 1 }}
                      />
                    </Typography>

                    <Typography variant="body2" color="text.primary">
                      <strong>Category:</strong>{" "}
                      <Chip
                        label={order.leasingOrderDetails?.leasingOrderCategory || LEASING_ORDER_CATEGORY.REGULAR}
                        size="small"
                        color={
                          order.leasingOrderDetails?.leasingOrderCategory === LEASING_ORDER_CATEGORY.REGULAR || !order.leasingOrderDetails?.leasingOrderCategory
                            ? "primary"
                            : order.leasingOrderDetails?.leasingOrderCategory === LEASING_ORDER_CATEGORY.AD_HOC
                              ? "secondary"
                              : order.leasingOrderDetails?.leasingOrderCategory === LEASING_ORDER_CATEGORY.ADJUSTMENT
                                ? "warning"
                                : "default"
                        }
                        sx={{ ml: 1 }}
                      />
                    </Typography>

                    <Typography variant="body2" color="text.primary">
                      <strong>Status:</strong>{" "}
                      <Chip
                        label={getCombinedStatus(order)}
                        size="small"
                        color={getStatusColor(getCombinedStatus(order))}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    {order.orderType === "LEASING" && (
                      <>
                        {leasingDetails.pickupDate && (
                          <Typography variant="body2" color="text.primary">
                            <strong>Pickup Date:</strong>{" "}
                            {formatCustomDate(leasingDetails.pickupDate)}
                          </Typography>
                        )}
                        {leasingDetails.deliveryDate && (
                          <Typography variant="body2" color="text.primary">
                            <strong>Delivery Date:</strong>{" "}
                            {formatCustomDate(leasingDetails.deliveryDate)}
                          </Typography>
                        )}
                      </>
                    )}

                    {order.orderType === "RENTAL" && (
                      <>
                        {rentalDetails.deliveryDate && (
                          <Typography variant="body2" color="text.primary">
                            <strong>Delivery Date:</strong>{" "}
                            {formatCustomDate(rentalDetails.deliveryDate)}
                          </Typography>
                        )}
                      </>
                    )}

                    {order.orderType === "WASHING" && (
                      <>
                        {washingDetails.pickupDate && (
                          <Typography variant="body2" color="text.primary">
                            <strong>Pickup Date:</strong>{" "}
                            {formatCustomDate(washingDetails.pickupDate)}
                          </Typography>
                        )}
                        {washingDetails.deliveryDate && (
                          <Typography variant="body2" color="text.primary">
                            <strong>Delivery Date:</strong>{" "}
                            {formatCustomDate(washingDetails.deliveryDate)}
                          </Typography>
                        )}
                      </>
                    )}
                      {order.notes && (
                        <Typography variant="body2" color="text.primary">
                          <strong>Notes:</strong> {order.notes}
                        </Typography>
                      )}
                  </Box>
                }
              />
            </ListItem>

            <Divider sx={{ my: 1 }} />

            {/* ===== LEASING DETAILS ===== */}
            {order.orderType === "LEASING" && (
              <>
                {/* DELIVERY ITEMS */}
                {(leasingDetails.deliveryItems || []).length > 0 && (
                  <>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            <DeliveryIcon
                              sx={{ mr: 1, color: "success.dark" }}
                            />
                            <Typography
                              variant="subtitle1"
                              sx={{
                                color: "success.dark",
                                fontWeight: 500,
                              }}
                            >
                              Delivery Items
                            </Typography>

                            <Box sx={{ flexGrow: 1 }} />

                            <Button
                              variant="contained"
                              onClick={() => setReserveDialogOpen(true)}
                              sx={{
                                backgroundColor: "success.main",
                                color: "#fff",
                                boxShadow: 3,
                                textTransform: "none",
                                mr: 1,
                                "&:hover": {
                                  backgroundColor: "success.dark",
                                },
                              }}
                            >
                              Fulfillment Packing
                            </Button>

                            <Button
                              variant="contained"
                              sx={{
                                background: "#f44336",
                                "&:hover": {
                                  background: "#d10909ff",
                                },
                              }}
                              onClick={() => setRejectDialogOpen(true)}
                            >
                              Reject
                            </Button>
                          </Box>
                        }
                        secondary={
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 500 }}>
                                    Product
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    Ordered quantity
                                  </TableCell>
                                  {/* <TableCell
                                    align="center"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    Packed quantity
                                  </TableCell> */}
                                  <TableCell
                                    align="center"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    Delivered quantity
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    Rejected quantity
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(leasingDetails.deliveryItems || []).map(
                                  (item) => (
                                    <TableRow key={item.productId}>
                                      <TableCell>
                                        {item.productName}
                                      </TableCell>
                                      <TableCell align="center">
                                        {item.quantity}
                                      </TableCell>
                                      {/* <TableCell
                                          variant="scan"
                                          value={item.packedQuantity ?? 0}
                                          editable={false}
                                          inventoryItemIds={item.packedInventoryItemIds || []}
                                        /> */}
                                      <TableCell
                                        variant="scan"
                                        value={item.actualQuantity ?? 0}
                                        editable={false}
                                        inventoryItemIds={item.inventoryItemIds || []}
                                      />
                                      <TableCell
                                        variant="scan"
                                        value={item.rejectedQuantity || 0}
                                        editable={false}
                                        inventoryItemIds={item.rejectedInventoryItemIds || []}
                                      />
                                    </TableRow>
                                  ),
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        }
                      />
                    </ListItem>
                    <Divider sx={{ my: 1 }} />
                  </>
                )}

                {/* PICKUP ITEMS */}
                {(leasingDetails.pickupItems || []).length > 0 && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <PickupIcon sx={{ mr: 1, color: "success.dark" }} />
                          <Typography
                            variant="subtitle1"
                            sx={{
                              color: "success.dark",
                              fontWeight: 500,
                            }}
                          >
                            Pickup Items
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 500 }}>
                                  Product
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ fontWeight: 500 }}
                                >
                                  Quantity
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ fontWeight: 500 }}
                                >
                                  Actual Quantity
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ fontWeight: 500 }}
                                >
                                  Heavy Soiled Quantity
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{ fontWeight: 500 }}
                                >
                                  Damaged Quantity
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(leasingDetails.pickupItems || []).map(
                                (item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell align="center">
                                      {item.quantity}
                                    </TableCell>
                                    <TableCell align="center">
                                      {item.actualQuantity ?? 0}
                                    </TableCell>
                                    <TableCell align="center">
                                      {item.heavySoiledQuantity ?? 0}
                                    </TableCell>
                                    <TableCell align="center">
                                      {item.damagedQuantity ?? 0}
                                    </TableCell>
                                  </TableRow>
                                ),
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      }
                    />
                  </ListItem>
                )}

                <Divider sx={{ my: 1 }} />

                {/* Fulfillment Details */}
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle1"
                        sx={{ color: "#2e7d32", fontWeight: 500, mb: 1 }}
                      >
                        Fulfillment Details
                      </Typography>
                    }
                    secondary={
                      <Box>
                        {leasingDetails.orderFulfillment && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              <strong>Order Fulfillment ID:</strong>{" "}
                              {leasingDetails.orderFulfillment.id}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Status:</strong>{" "}
                              {leasingDetails.orderFulfillment.status === "INVENTORY_PACKED"
                                ? "PACKED"
                                : leasingDetails.orderFulfillment.status}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Start Date:</strong>{" "}
                              {formatCustomDate(
                                leasingDetails.orderFulfillment
                                  .fulfillmentStartDate,
                              )}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Completion Date:</strong>{" "}
                              {formatCustomDate(
                                leasingDetails.orderFulfillment
                                  .fulfillmentCompletionDate,
                              ) || "N/A"}
                            </Typography>
                          </Box>
                        )}

                        {leasingDetails.pickupFulfillment && (
                          <Box>
                            <Typography variant="body2">
                              <strong>Pickup Fulfillment ID:</strong>{" "}
                              {leasingDetails.pickupFulfillment.id}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Status:</strong>{" "}
                              {leasingDetails.pickupFulfillment.status}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Pickup Date:</strong>{" "}
                              {formatCustomDate(
                                leasingDetails.pickupFulfillment.pickupDate,
                              )}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </>
            )}

            {/* ===== REJECTION REQUESTS ===== */}
            {(order.leasingOrderDetails?.rejectionRequests || []).length >
              0 && (
                <>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography
                          variant="subtitle1"
                          sx={{
                            color: "error.main",
                            fontWeight: 500,
                            mb: 1,
                          }}
                        >
                          Rejection Requests
                        </Typography>
                      }
                      secondary={
                        <Box>
                          {[...(order.leasingOrderDetails?.rejectionRequests || [])]
                            .sort((a, b) => {
                              if (a.status === "APPROVED" && b.status !== "APPROVED") return 1;
                              if (b.status === "APPROVED" && a.status !== "APPROVED") return -1;
                              return 0;
                            })
                            .map((rejectionRequest) => {
                            const productName = rejectionRequest.productName;
                            const isApproved = rejectionRequest.status === "APPROVED";
                            const isPending = rejectionRequest.status === "PENDING";
                            
                            let themeColor = "#f44336"; // Default/Rejected: Red
                            let bgLight = "rgba(244, 67, 54, 0.04)";
                            if (isApproved) {
                              themeColor = "#2e7d32"; // Approved: Green
                              bgLight = "rgba(46, 125, 50, 0.04)";
                            } else if (isPending) {
                              themeColor = "#ed6c02"; // Pending: Orange
                              bgLight = "rgba(237, 108, 2, 0.04)";
                            }

                            return (
                               <Box
                                 key={rejectionRequest.id}
                                 sx={{
                                   border: "1px solid rgba(0, 0, 0, 0.08)",
                                   borderLeft: `5px solid ${themeColor}`,
                                   borderRadius: "12px",
                                   p: 2.5,
                                   mb: 2.5,
                                   bgcolor: "#ffffff",
                                   boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                                   transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                   position: "relative",
                                   "&:hover": {
                                     boxShadow: "0 8px 20px rgba(0, 0, 0, 0.06)",
                                     transform: "translateY(-2px)",
                                   },
                                 }}
                               >
                                  {/* Combined Header & Metadata (All in one line aligned with Status) */}
                                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                    <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
                                      {productName && (
                                        <Box>
                                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                            Product
                                          </Typography>
                                          <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "text.primary" }}>
                                            {productName}
                                          </Typography>
                                        </Box>
                                      )}

                                      {productName && <Box sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)", height: 28, mx: 0.5 }} />}

                                      <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                          ID
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                                          #{rejectionRequest.id}
                                        </Typography>
                                      </Box>

                                      <Box sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)", height: 28, mx: 0.5 }} />

                                      <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                          Quantity
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                                          {rejectionRequest.quantity} pcs
                                        </Typography>
                                      </Box>

                                      <Box sx={{ borderLeft: "1px solid rgba(0,0,0,0.08)", height: 28, mx: 0.5 }} />

                                      <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                          Issue
                                        </Typography>
                                        <Chip
                                          label={rejectionRequest.issueType}
                                          size="small"
                                          color="error"
                                          variant="outlined"
                                          sx={{ height: 20, fontSize: "0.7rem", fontWeight: 500 }}
                                        />
                                      </Box>
                                    </Box>

                                    <Chip
                                      label={rejectionRequest.status}
                                      size="small"
                                      sx={{
                                        fontWeight: "bold",
                                        height: 22,
                                        fontSize: "0.7rem",
                                        bgcolor: bgLight,
                                        color: themeColor,
                                        border: `1px solid ${themeColor}33`,
                                      }}
                                    />
                                  </Box>

                                 {/* Remarks / Notes */}
                                 {rejectionRequest.remarks && (
                                   <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: "0.85rem" }}>
                                     <strong>Notes:</strong> {rejectionRequest.remarks}
                                   </Typography>
                                 )}

                                 {/* Card Footer Actions */}
                                 <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 1.5, borderTop: "1px solid rgba(0, 0, 0, 0.05)" }}>
                                   <VisitImagesDialog
                                     imageUrls={rejectionRequest.images || []}
                                     title="Rejection Images"
                                   />

                                   <Box sx={{ display: "flex", gap: 1 }}>
                                     {!isApproved && (
                                       <>
                                         <Button
                                           variant="contained"
                                           color="success"
                                           size="small"
                                           onClick={() => handleRejectRequestApprove(rejectionRequest)}
                                           sx={{ textTransform: "none", fontWeight: 600, boxShadow: "none", "&:hover": { boxShadow: "none" } }}
                                         >
                                           Approve
                                         </Button>

                                         <Button
                                           variant="outlined"
                                           color="error"
                                           size="small"
                                           onClick={() => handleRejectRequestDelete(rejectionRequest)}
                                           sx={{ textTransform: "none", fontWeight: 600 }}
                                         >
                                           Delete
                                         </Button>
                                       </>
                                     )}
                                   </Box>
                                 </Box>
                               </Box>
                             );
                          })}
                        </Box>
                      }
                    />
                  </ListItem>

                  <Divider />
                </>
              )}

            {/* ACTIONS FOOTER */}
            <Box sx={{ display: "flex", gap: 1.5, mt: 2, alignItems: "center" }}>
              {order.status !== "COMPLETED" && (
                <Button
                  variant="contained"
                  color="success"
                  disabled={isCompletingApi}
                  onClick={handleOrderComplete}
                >
                  {isCompletingApi ? "Completing..." : "Complete Order"}
                </Button>
              )}

              {order.leasingOrderDetails?.orderFulfillment && loadingPackingJob && (
                <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
                  <GlowingDot color="#4caf50" size={10} />
                </Box>
              )}

              {order.leasingOrderDetails?.orderFulfillment && !loadingPackingJob && !packingJob && (
                <Button
                  variant="contained"
                  disabled={isCreatingPackingJob}
                  onClick={handleCreatePackingJob}
                  sx={{
                    backgroundColor: "success.main",
                    color: "#fff",
                    boxShadow: 3,
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: "success.dark",
                    },
                  }}
                >
                  {isCreatingPackingJob ? "Creating..." : "Create Packing Job"}
                </Button>
              )}
            </Box>

            {/* Reserve items dialog */}
            <ReserveItemsDialog
              open={reserveDialogOpen}
              onClose={() => setReserveDialogOpen(false)}
              deliveryItems={order.leasingOrderDetails?.deliveryItems || []}
              customerId={customerId}
              orderId={order.id}
              orderFulfillmentId={order.leasingOrderDetails?.orderFulfillment?.id}
            />

            {/* Rejection items dialog */}
            <RejectItemsDialog
              isRejectDialogOpen={rejectDialogOpen}
              onRejectDialogClose={() => setRejectDialogOpen(false)}
              deliveryItems={order.leasingOrderDetails?.deliveryItems || []}
              rejectionRequests={leasingDetails.rejectionRequests || []}
              customerId={customerId}
              orderId={order.id}
              onRejectRequestCreated={handleRejectRequestCreated}
              showSnackbar={showOrderDetailsSnackbar}
            />
          </List>
        </Box>

        {/* Shared Custom Snackbar*/}
        <CustomSnackbar
          open={orderSnackbarOpen}
          message={orderSnackbarMessage}
          severity={orderSnackbarSeverity}
          onClose={closeOrderDetailsSnackbar}
        />
      </Box>
    </CustomDrawer>
  );
}

export default OrderDetailSidebar;
