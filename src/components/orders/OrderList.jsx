import React, { useState, useEffect } from "react";
import { useRejectionOrders } from "../../hooks/useOrders";
import { useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Autocomplete,
  Box,
  Chip,
  IconButton,
  Card,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as DeliveryIcon,
  ShoppingBasket as PickupIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import debounce from "lodash.debounce";
import CreateOrderDialog from "./CreateOrderDialog";
import OrderDetailSidebar from "./OrderDetailSidebar";
import { orderService } from "../../services/orderService";
import { customerService } from "../../services/customerService";
import CustomSnackbar from "../layout/CustomSnackbar";
import LoaderScreen from "../dashboard/LoaderScreen";
import { formatCustomDate, DATE_TIME } from "../../utils/dateUtils";

import DownloadWorkReportButton from "./DownloadWorkReportButton";
import DataTable from "../common/tables/DataTable";

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

const getRejectionStatus = (order) => {
  const rejections = order?.leasingOrderDetails?.rejectionRequests || [];
  if (rejections.length === 0) {
    return null;
  }
  const hasPending = rejections.some(r => r.status === "PENDING");
  const hasApproved = rejections.some(r => r.status === "APPROVED");
  const hasRejected = rejections.some(r => r.status === "REJECTED");

  if (hasPending) return "PENDING";
  if (hasApproved) return "APPROVED";
  if (hasRejected) return "REJECTED";
  return rejections[0]?.status || "N/A";
};

const getRejectionColor = (status) => {
  switch (status) {
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "error";
    default:
      return "default";
  }
};

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [endDate, setEndDate] = useState(new Date());
  const [startDate, setStartDate] = useState(subDays(new Date(), 2));

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [customSnackbarOpen, setCustomSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOrder, setDialogOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(""); // empty = All
  const [selectedRejectionStatus, setSelectedRejectionStatus] = useState(""); // empty = All
  const queryClient = useQueryClient();


  const statusOptions = [
    "PENDING",
    "CONFIRMED",
    "OUT_FOR_DELIVERY",
    "IN_PROGRESS",
    "READY",
    "COMPLETED",
    "CANCELLED",
  ];

  const rejectionStatusOptions = [
    { value: "", label: "All" },
    { value: "ALL_REJECTIONS", label: "All Rejections" },
    { value: "PENDING", label: "PENDING" },
    { value: "APPROVED", label: "APPROVED" },
    { value: "REJECTED", label: "REJECTED" },
  ];

  // Helper: normalize possible Dayjs/Date values and format as local datetime without Z
  const asDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v?.$d instanceof Date) return v.$d;
    const parsed = new Date(v);
    return isNaN(parsed?.getTime?.()) ? null : parsed;
  };

  const toLocalDateTimeString = (d, isEnd = false) => {
    if (!d) return null;
    const dt = isEnd ? endOfDay(d) : startOfDay(d);
    return format(dt, "yyyy-MM-dd'T'HH:mm:ss");
  };

  const { data: rejectionOrders = [], refetch: fetchRejectionStats } = useRejectionOrders();

  const pendingRejectionCount = React.useMemo(() => {
    let count = 0;
    rejectionOrders.forEach((order) => {
      const rejections = order?.leasingOrderDetails?.rejectionRequests || [];
      rejections.forEach((r) => {
        if (r.status === "PENDING") {
          count++;
        }
      });
    });
    return count;
  }, [rejectionOrders]);

  const rawFetchCustomerOptions = async (query) => {
    try {
      if (!query || query.trim().length < 2) {
        setCustomerOptions([]);
        return;
      }
      const data = await customerService.searchCustomersByName(query.trim());
      setCustomerOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchCustomerOptions = React.useMemo(
    () => debounce(rawFetchCustomerOptions, 300),
    [],
  );

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const filter = {
        startDate: startDate ? toLocalDateTimeString(asDate(startDate), false) : null,
        endDate: endDate ? toLocalDateTimeString(asDate(endDate), true) : null,
        status: selectedStatus || null,
        orderType: null, // Add orderType if needed
        customerId: selectedCustomer ? selectedCustomer.id : null, // Include customerId if a customer is selected
        branchId: null, // Add branchId if needed
      };

      const ordersData = await orderService.searchOrders(filter);
      console.log("Fetched Orders:", ordersData); // Debugging: Check the fetched data
      const list = Array.isArray(ordersData)
        ? ordersData
        : (ordersData?.content ?? []);
      setOrders(list);
    } catch (error) {
      console.error("Failed to fetch orders", error);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (order) => {
    setIsDetailSidebarOpen(false); // close drawer if it’s open
    setIsCreating(false);
    setDialogOrder(order);
    setDialogOpen(true);
  };

  const handleRowClick = (order) => {
    setSelectedOrder(order);
    setIsDetailSidebarOpen(true);
  };

  const handleOrderUpdate = (updatedOrder) => {
    setOrders(orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    setSelectedOrder(updatedOrder);
    queryClient.setQueryData(["rejectionOrders14Days"], (prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
    });
  };

  const handleCreateOrder = () => {
    setIsDetailSidebarOpen(false);
    setIsCreating(true);
    setDialogOrder(null);
    setDialogOpen(true);
  };

  const handleSaveOrder = async (savedOrderData) => {
    try {
      if (dialogOrder) {
        // Update the orders state with the updated order (already saved in dialog)
        setOrders(
          orders.map((o) => (o.id === savedOrderData.id ? savedOrderData : o)),
        );
        queryClient.setQueryData(["rejectionOrders14Days"], (prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((o) => (o.id === savedOrderData.id ? savedOrderData : o));
        });
      } else {
        // Add the new order to the beginning of the state (already created in dialog)
        setOrders([savedOrderData, ...orders]);
      }
      setDialogOpen(false);
      setIsCreating(false);
      setDialogOrder(null);
      setIsDetailSidebarOpen(false); // Ensure details pane remains closed
    } catch (error) {
      console.error("Failed to save order", error);
      setErrorMessage("Failed to save order");
      setCustomSnackbarOpen(true);
    }
  };

  const handleDialogClose = () => {
    setIsDetailSidebarOpen(false);
    setIsCreating(false);
    setDialogOrder(null);
    setDialogOpen(false);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await orderService.deleteOrderById(orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setIsDetailSidebarOpen(false);
        setSelectedOrder(null);
        queryClient.setQueryData(["rejectionOrders14Days"], (prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.filter((o) => o.id !== orderId);
        });
      } catch (error) {
        console.error("Failed to delete order", error);
        setErrorMessage("Failed to delete order");
        setCustomSnackbarOpen(true);
      }
    }
  };

  const columns = [
    {
      field: "id",
      headerName: "Order ID",
      type: "smallNumber",
      width: 70,
    },
    {
      field: "customerName",
      headerName: "Customer Name",
      type: "longText",
      render: (value) => value || "N/A",
    },
    {
      field: "orderDate",
      headerName: "Ordered Date",
      type: "text",
      tooltipVal: (value) => formatCustomDate(value, DATE_TIME),
      render: (value) => formatCustomDate(value, DATE_TIME),
    },
    {
      field: "orderType",
      headerName: "Order Type",
      type: "smallText",
      tooltipVal: (value, row) => {
        if (value === "LEASING") {
          const category = row.leasingOrderDetails?.leasingOrderCategory || "REGULAR";
          const categoryNames = {
            REGULAR: "Regular",
            AD_HOC: "Ad Hoc",
            ADJUSTMENT: "Adjustment",
            RETURN: "Return",
            ALLOCATION: "Allocation",
            REPLENISHMENT: "Replenishment",
          };
          return `Category: ${categoryNames[category] || category}`;
        }
        return value || "";
      },
      render: (value, row) => {
        if (value === "LEASING") {
          const category = row.leasingOrderDetails?.leasingOrderCategory || "REGULAR";
          const categoryShorthands = {
            REGULAR: "REG",
            AD_HOC: "ADH",
            ADJUSTMENT: "ADJ",
            RETURN: "RTN",
            ALLOCATION: "ALC",
            REPLENISHMENT: "RPL",
          };

          const categoryStyles = {
            REGULAR: { bg: "#f1f5f9", color: "#475569" },
            AD_HOC: { bg: "#fffbeb", color: "#b45309" },
            ADJUSTMENT: { bg: "#eff6ff", color: "#1d4ed8" },
            RETURN: { bg: "#fdf2f8", color: "#be185d" },
            ALLOCATION: { bg: "#f0fdf4", color: "#15803d" },
            REPLENISHMENT: { bg: "#faf5ff", color: "#7e22ce" },
          };

          const catStyle = categoryStyles[category] || categoryStyles.REGULAR;

          return (
            <Box sx={{
              display: "inline-flex",
              alignItems: "center",
              height: 24,
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid rgba(156, 39, 176, 0.18)",
            }}>
              {/* Left Block */}
              <Box sx={{
                backgroundColor: "rgba(156, 39, 176, 0.08)",
                color: "#9c27b0",
                px: 1,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 400,
                fontSize: "0.8125rem",
                letterSpacing: "0.5px",
                borderRight: "1px solid rgba(156, 39, 176, 0.18)",
              }}>
                LEASING
              </Box>
              {/* Right Block */}
              <Box sx={{
                backgroundColor: catStyle.bg,
                color: catStyle.color,
                px: 1,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 400,
                fontSize: "0.8125rem",
              }}>
                {categoryShorthands[category] || category}
              </Box>
            </Box>
          );
        }

        let icon = undefined;
        let colorObj = {};

        if (value === "DELIVERY") {
          icon = <DeliveryIcon fontSize="small" />;
          colorObj = { backgroundColor: "rgba(46, 125, 50, 0.1)", color: "#2e7d32" };
        } else if (value === "PICKUP") {
          icon = <PickupIcon fontSize="small" />;
          colorObj = { backgroundColor: "rgba(25, 118, 210, 0.1)", color: "#1976d2" };
        } else {
          colorObj = { backgroundColor: "rgba(156, 39, 176, 0.1)", color: "#9c27b0" };
        }

        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Chip
              size="small"
              icon={icon}
              label={value}
              sx={{
                ...colorObj,
                height: 24,
                "& .MuiChip-label": { px: 1.25, fontWeight: 400, fontSize: "0.8125rem" },
                "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
              }}
            />
          </Box>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      type: "shortText",
      render: (_, row) => {
        const combinedStatus = getCombinedStatus(row);
        return (
          <Chip
            label={combinedStatus}
            size="small"
            color={getStatusColor(combinedStatus)}
          />
        );
      },
    },
    {
      field: "rejectionStatus",
      headerName: "Issue Raised",
      type: "shortText",
      render: (_, row) => {
        const rejections = row?.leasingOrderDetails?.rejectionRequests || [];
        if (rejections.length === 0) return "--";
        const totalQty = rejections.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
        return `${totalQty} pcs`;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      align: "right",
      width: 70,
      type: "smallNumber",
      stopPropagation: true,
      render: (_, row) => (
        <>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(row);
            }}
            sx={{ color: 'primary.main' }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteOrder(row.id);
            }}
            sx={{ color: 'warning.main' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  useEffect(() => {
    return () => fetchCustomerOptions.cancel?.();
  }, [fetchCustomerOptions]);

  useEffect(() => {
    fetchOrders(); // Initial fetch
  }, []);

  const filteredOrders = React.useMemo(() => {
    if (selectedRejectionStatus === "") {
      return orders;
    }
    const sourceList = rejectionOrders;
    if (selectedRejectionStatus === "ALL_REJECTIONS") {
      return sourceList.filter((order) => getRejectionStatus(order) !== null);
    }
    return sourceList.filter((order) => {
      const rejStatus = getRejectionStatus(order);
      return rejStatus === selectedRejectionStatus;
    });
  }, [orders, rejectionOrders, selectedRejectionStatus]);

  if (loading) {
    return <LoaderScreen />;
  }
  if (error) return <div>{error}</div>;

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 2,
          position: "sticky",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar + 1,
          backgroundColor: "background.paper",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          Order Management
        </Typography>

        {/* Filters aligned: left group and right group */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            width: "100%",
          }}
        >
          {/* Left group: Customer, Start Date, End Date, Apply */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: { xs: "wrap", md: "nowrap" },
              overflowX: { xs: "auto", md: "visible" },
              pb: 0.5,
            }}
          >
            {/* Customer */}
            <Box sx={{ width: 150, minWidth: 130 }}>
              <Autocomplete
                options={customerOptions}
                getOptionLabel={(option) => option?.name ?? ""}
                isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
                value={selectedCustomer}
                onInputChange={(event, newInputValue, reason) => {
                  if (reason === "input") {
                    fetchCustomerOptions(newInputValue);
                  }
                }}
                onChange={(event, newValue) => setSelectedCustomer(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Customer Name" fullWidth />
                )}
              />
            </Box>

            {/* Start Date */}
            <Box sx={{ width: 150, minWidth: 130 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    sx: { borderRadius: 1 },
                  },
                }}
              />
            </Box>

            {/* End Date */}
            <Box sx={{ width: 150, minWidth: 130 }}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    sx: { borderRadius: 1 },
                  },
                }}
              />
            </Box>

            {/* Status */}
            <Box sx={{ width: 90, minWidth: 90 }}>
              <TextField
                select
                label="Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Rejection Status */}
            <Box sx={{ width: 100, minWidth: 90 }}>
              <TextField
                select
                label="Rejection Status"
                value={selectedRejectionStatus}
                onChange={(e) => setSelectedRejectionStatus(e.target.value)}
                fullWidth
              >
                {rejectionStatusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Apply */}
            <Button
              variant="contained"
              onClick={fetchOrders}
              disabled={loading}
              sx={{
                height: 40,
                minWidth: 96,
                whiteSpace: "nowrap",
                textTransform: "none",
                background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
                boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
              }}
            >
              Apply
            </Button>
          </Box>

          {/* Right group: Download, Add Order */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <DownloadWorkReportButton
              startDate={asDate(startDate)}
              endDate={asDate(endDate)}
              selectedCustomer={selectedCustomer}
              sx={{
                height: 40,
                minWidth: 120,
                whiteSpace: "nowrap",
              }}
            />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateOrder}
              data-agent-action="add-order"
              sx={{
                height: 40,
                minWidth: 120,
                whiteSpace: "nowrap",
                textTransform: "none",
                background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
                boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
              }}
            >
              Add Order
            </Button>
          </Box>
        </Box>
      </Paper>

      {pendingRejectionCount > 0 && (
        <Card
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: "#FFF7ED",
            border: "1px solid #FED7AA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <ErrorIcon sx={{ color: "#f88800" }} />
            <Typography fontWeight={600} sx={{ color: "#c2410c" }}>
              {pendingRejectionCount} pending rejection requests from the last 14 days
            </Typography>
          </Stack>
          {selectedRejectionStatus === "PENDING" ? (
            <Button
              size="small"
              onClick={() => setSelectedRejectionStatus("")}
              sx={{
                fontWeight: 700,
                color: "#ED6C02",
                textTransform: "none",
                "&:hover": { backgroundColor: "rgba(237, 108, 2, 0.08)" },
              }}
            >
              Clear Filter
            </Button>
          ) : (
            <Button
              size="small"
              onClick={() => setSelectedRejectionStatus("PENDING")}
              sx={{
                fontWeight: 700,
                color: "#ED6C02",
                textTransform: "none",
                "&:hover": { backgroundColor: "rgba(237, 108, 2, 0.08)" },
              }}
            >
              Show Details
            </Button>
          )}
        </Card>
      )}

      <DataTable
        columns={columns}
        rows={filteredOrders}
        onRowClick={handleRowClick}
        selectedId={selectedOrder?.id}
      />

      <OrderDetailSidebar
        open={isDetailSidebarOpen}
        order={selectedOrder}
        key={selectedOrder?.id}
        onClose={() => setIsDetailSidebarOpen(false)}
        onUpdateOrder={handleOrderUpdate}
      />

      <CreateOrderDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleSaveOrder}
        order={isCreating ? null : dialogOrder}
      />
      <CustomSnackbar
        open={customSnackbarOpen}
        message={errorMessage}
        onClose={() => setCustomSnackbarOpen(false)}
      />
    </Container>
  );
}

export default OrderList;
