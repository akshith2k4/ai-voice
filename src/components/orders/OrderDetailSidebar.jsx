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
} from "@mui/material";
import TableCell from "../common/TableCell";
import {
  Close as CloseIcon,
  LocalShipping as DeliveryIcon,
  ShoppingBasket as PickupIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import ReserveItemsDialog from "./ReserveItemsDialog";
import RejectItemsDialog from "./RejectItemsDialog";
import { orderService } from "../../services/orderService";
import VisitImagesDialog from "../trips/VisitImagesDialog";
import CustomSnackbar from "../layout/CustomSnackbar";
import { formatCustomDate } from "../../utils/dateUtils";
import CustomDrawer from "../common/CustomDrawer";

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

/* ================= COMPONENT ================= */

function OrderDetailSidebar({ order, onClose, onUpdateOrder }) {
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

  /* ================= COMPLETE ORDER STATE ================= */

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
                      <strong>Status:</strong>{" "}
                      <Chip
                        label={order.status}
                        size="small"
                        color={
                          order.status === "COMPLETED"
                            ? "success"
                            : order.status === "PENDING"
                              ? "warning"
                              : "error"
                        }
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
                    <Box>
                      <Typography variant="body2" color="text.primary">
                        <strong>Notes With Order:- </strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {order.notes}
                      </Typography>
                    </Box>
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
                              {leasingDetails.orderFulfillment.status}
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
                        {(
                          order.leasingOrderDetails?.rejectionRequests || []
                        ).map((rejectionRequest) => {
                          const productName = rejectionRequest.productName;
                          const isApproved =
                            rejectionRequest.status === "APPROVED";

                          return (
                            <Box
                              key={rejectionRequest.id}
                              sx={{
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 2,
                                p: 2,
                                mb: 2,
                                bgcolor: "background.default",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Typography sx={{ fontWeight: 600 }}>
                                  {productName}
                                </Typography>

                                <VisitImagesDialog
                                  imageUrls={rejectionRequest.images || []}
                                  title="Rejection Images"
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Box>
                                  <Typography sx={{ mt: 1 }}>
                                    Qty:{" "}
                                    <strong>{rejectionRequest.quantity}</strong>
                                  </Typography>

                                  <Typography sx={{ mt: 1 }}>
                                    Issue:{" "}
                                    <Typography
                                      component="span"
                                      color="error.main"
                                      fontWeight="bold"
                                    >
                                      {rejectionRequest.issueType}
                                    </Typography>
                                  </Typography>

                                  <Typography sx={{ mt: 1 }}>
                                    Status:{" "}
                                    <Typography
                                      component="span"
                                      sx={{
                                        fontWeight: "bold",
                                        color: isApproved
                                          ? "success.main"
                                          : "error.main",
                                      }}
                                    >
                                      {rejectionRequest.status}
                                    </Typography>
                                  </Typography>

                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 1,
                                      mt: 2,
                                    }}
                                  >
                                    {!isApproved && (
                                      <>
                                        <Button
                                          variant="outlined"
                                          onClick={() =>
                                            handleRejectRequestApprove(
                                              rejectionRequest,
                                            )
                                          }
                                        >
                                          Approve
                                        </Button>

                                        <Button
                                          variant="outlined"
                                          color="error"
                                          onClick={() =>
                                            handleRejectRequestDelete(
                                              rejectionRequest,
                                            )
                                          }
                                        >
                                          Delete
                                        </Button>
                                      </>
                                    )}
                                  </Box>
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

            {/* COMPLETE ORDER BUTTON */}
            {order.status !== "COMPLETED" && (
              <Button
                variant="contained"
                color="success"
                disabled={isCompletingApi}
                onClick={handleOrderComplete}
                sx={{ mt: 2 }}
              >
                {isCompletingApi ? "Completing..." : "Complete Order"}
              </Button>
            )}

            {/* Reserve items dialog */}
            <ReserveItemsDialog
              open={reserveDialogOpen}
              onClose={() => setReserveDialogOpen(false)}
              deliveryItems={order.leasingOrderDetails?.deliveryItems || []}
              customerId={customerId}
              orderId={order.id}
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
