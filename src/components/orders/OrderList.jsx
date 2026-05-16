import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Drawer,
  Autocomplete,
  Box,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import debounce from "lodash.debounce";
import CreateOrderDialog from "./CreateOrderDialog";
import OrderDetailSidebar from "./OrderDetailSidebar";
import { orderService } from "../../services/orderService";
import { customerService } from "../../services/customerService";
import CustomSnackbar from "../layout/CustomSnackbar";
import LoaderScreen from "../dashboard/LoaderScreen";

import DownloadWorkReportButton from "./DownloadWorkReportButton";
import OrderRow from "./OrderRow";

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [endDate, setEndDate] = useState(new Date());
  const [startDate, setStartDate] = useState(subDays(new Date(), 2));

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [customSnackbarOpen, setCustomSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOrder, setDialogOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(""); // empty = All

  const statusOptions = [
    "PENDING",
    "CONFIRMED",
    "OUT_FOR_DELIVERY",
    "IN_PROGRESS",
    "READY",
    "COMPLETED",
    "CANCELLED",
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

  useEffect(() => {
    return () => fetchCustomerOptions.cancel?.();
  }, [fetchCustomerOptions]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const filter = {
        startDate: startDate
          ? toLocalDateTimeString(asDate(startDate), false)
          : null,
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

  useEffect(() => {
    fetchOrders(); // Initial fetch on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once



  const handleEditClick = (order) => {
    setSelectedOrder(null); // close drawer if it’s open
    setIsCreating(false);
    setDialogOrder(order);
    setDialogOpen(true);
  };

  const handleRowClick = (order) => {
    setSelectedOrder(order);
  };

  const handleOrderUpdate = (updatedOrder) => {
    setOrders(orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    setSelectedOrder(updatedOrder);
  };

  const handleCreateOrder = () => {
    setSelectedOrder(null);
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
      } else {
        // Add the new order to the beginning of the state (already created in dialog)
        setOrders([savedOrderData, ...orders]);
      }
      setDialogOpen(false);
      setIsCreating(false);
      setDialogOrder(null);
      setSelectedOrder(null); // Ensure details pane remains closed
    } catch (error) {
      console.error("Failed to save order", error);
      setErrorMessage("Failed to save order");
      setCustomSnackbarOpen(true);
    }
  };

  const handleDialogClose = () => {
    setSelectedOrder(null);
    setIsCreating(false);
    setDialogOrder(null);
    setDialogOpen(false);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await orderService.deleteOrderById(orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setSelectedOrder((prev) => (prev?.id === orderId ? null : prev));
      } catch (error) {
        console.error("Failed to delete order", error);
        setErrorMessage("Failed to delete order");
        setCustomSnackbarOpen(true);
      }
    }
  };

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
            <Box sx={{ width: 150, minWidth: 130 }}>
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
              data-agent-action="add-order"
              onClick={handleCreateOrder}
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

      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  py: 1.5,
                  backgroundColor: "primary.lighter",
                  fontWeight: 500,
                }}
              >
                Order ID
              </TableCell>

              <TableCell
                sx={{
                  py: 1.5,
                  backgroundColor: "primary.lighter",
                  fontWeight: 500,
                }}
              >
                Customer Name
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  backgroundColor: "primary.lighter",
                  fontWeight: 500,
                }}
              >
                Ordered Date
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  backgroundColor: "primary.lighter",
                  fontWeight: 500,
                }}
              >
                Order Type
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  backgroundColor: "primary.lighter",
                  fontWeight: 500,
                }}
              >
                Fulfillment Status
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  backgroundColor: "primary.lighter",
                  fontWeight: 500,
                }}
              >
               Order Status
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  backgroundColor: "primary.lighter",
                  fontWeight: 500,
                }}
                align="right"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                handleRowClick={handleRowClick}
                handleEditClick={handleEditClick}
                handleDeleteOrder={handleDeleteOrder}
              />
            ))}

            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No orders found matching your search
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <OrderDetailSidebar
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        key={selectedOrder?.id}
        onClose={() => setSelectedOrder(null)}
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
