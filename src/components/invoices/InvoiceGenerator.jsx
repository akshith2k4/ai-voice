// src/components/invoices/InvoiceGenerator.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
    Container,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Paper,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Chip,
    Box
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { orderService } from "../../services/orderService";
import { customerService } from "../../services/customerService";
import { invoiceService } from "../../services/invoiceService";
import { debounce } from "lodash";
import CustomSnackbar from "../layout/CustomSnackbar";
import { format, isValid as isValidDate } from "date-fns";
import { formatCustomDate } from "../../utils/dateUtils";

function InvoiceGenerator() {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date());
    const [orders, setOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [customSnackbarOpen, setCustomSnackbarOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);

    const INPUT_SX = {
        "& .MuiInputBase-root": { height: 44 },
        "& .MuiInputBase-input": { padding: "10px 12px", fontSize: "0.95rem" },
    };

    // const formatPretty = (d) =>
    //     isValidDate(d) ? format(d, "MMM do yyyy") : "—";

    const debouncedFetchCustomers = useMemo(
        () =>
            debounce(async (name) => {
                try {
                    const customerData =
                        await customerService.searchCustomersByName(name);
                    setCustomers(
                        Array.isArray(customerData) ? customerData : []
                    );
                } catch (error) {
                    const backendMessage =
                        error.response?.data?.message ||
                        "Failed to fetch customers. Please try again.";
                    setErrorMessage(backendMessage);
                    setCustomSnackbarOpen(true);
                }
            }, 300),
        []
    );

    useEffect(() => {
        return () => debouncedFetchCustomers.cancel();
    }, [debouncedFetchCustomers]);

    const handleCustomerInputChange = (event, value) => {
        if (value) debouncedFetchCustomers(value);
        else setCustomers([]);
    };

    const handleSearchOrders = async () => {
        if (!selectedCustomer || !startDate || !endDate) {
            alert("Please select a customer and date range.");
            return;
        }
        try {
            const filter = {
                customerId: selectedCustomer.id,
                // Keep your existing search shape (ISO) if backend expects it for search
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            };
            const ordersData = await orderService.searchOrders(filter);
            setOrders(Array.isArray(ordersData) ? ordersData : []);
            setSelectedOrders([]);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                "Failed to fetch orders. Please try again.";
            setErrorMessage(backendMessage);
            setCustomSnackbarOpen(true);
        }
    };

    const handleSelectOrder = (orderId) => {
        setSelectedOrders((prev) =>
            prev.includes(orderId)
                ? prev.filter((id) => id !== orderId)
                : [...prev, orderId]
        );
    };

    const allIds = orders.map((o) => o.id);
    const allSelected =
        allIds.length > 0 && selectedOrders.length === allIds.length;
    const isIndeterminate =
        selectedOrders.length > 0 && selectedOrders.length < allIds.length;

    const handleToggleSelectAll = (e) => {
        if (e.target.checked) setSelectedOrders(allIds);
        else setSelectedOrders([]);
    };

    const toLocalDateString = (d) =>
        isValidDate(d) ? format(d, "yyyy-MM-dd") : null;

    // Open confirmation dialog on clicking Generate Invoice
    const handleOpenConfirm = () => {
        if (!selectedCustomer) {
            alert("Please select a customer.");
            return;
        }
        if (selectedOrders.length === 0) {
            alert("Please select at least one order to generate an invoice.");
            return;
        }
        if (!startDate || !endDate) {
            alert("Please select start date and end date.");
            return;
        }
        // Default invoice date to today if somehow unset
        if (!invoiceDate) setInvoiceDate(new Date());
        setConfirmOpen(true);
    };

    // Confirm and call API
    const handleConfirmGenerate = async () => {
        const payload = {
            orderIds: selectedOrders, // List<Long>
            customerId: selectedCustomer.id, // Long
            startDate: toLocalDateString(startDate), // LocalDate (yyyy-MM-dd)
            endDate: toLocalDateString(endDate), // LocalDate (yyyy-MM-dd)
            invoiceDate: toLocalDateString(invoiceDate), // LocalDate (yyyy-MM-dd)
        };

        if (!payload.startDate || !payload.endDate || !payload.invoiceDate) {
            alert("Invalid date(s). Please reselect the dates.");
            return;
        }

        try {
            await invoiceService.createInvoice(payload);
            setConfirmOpen(false);
            alert("Invoice generated successfully!");
            setSelectedOrders([]);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                "Failed to generate invoice. Please try again.";
            setErrorMessage(backendMessage);
            setCustomSnackbarOpen(true);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mb: 4 }}>
            <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                    Generate Invoice
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: '100%' }}>
                    {/* Left group: Customer, Start Date, End Date */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                        <Box sx={{ minWidth: 200 }}>
                            <Autocomplete
                                options={customers}
                                getOptionLabel={(option) => option.name ?? ''}
                                size="small"
                                onInputChange={handleCustomerInputChange}
                                onChange={(event, newValue) => setSelectedCustomer(newValue)}
                                renderInput={(params) => (
                                    <TextField {...params} label="Select Customer" />
                                )}
                            />
                        </Box>

                        <Box sx={{ width: 220 }}>
                            <DatePicker
                                label="Start Date"
                                value={startDate}
                                onChange={(date) => setStartDate(date)}
                                slotProps={{
                                    textField: { fullWidth: true, size: 'small', sx: INPUT_SX },
                                }}
                            />
                        </Box>

                        <Box sx={{ width: 220 }}>
                            <DatePicker
                                label="End Date"
                                value={endDate}
                                onChange={(date) => setEndDate(date)}
                                slotProps={{
                                    textField: { fullWidth: true, size: 'small', sx: INPUT_SX },
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Right group: Apply */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSearchOrders}
                            sx={{ height: 44, minWidth: 120, whiteSpace: 'nowrap' }}
                        >
                            Apply
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <TableContainer component={Paper} elevation={3} sx={{ mt: 3 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell
                                padding="checkbox"
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    fontWeight: 500,
                                }}
                            >
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={isIndeterminate}
                                    onChange={handleToggleSelectAll}
                                    inputProps={{
                                        "aria-label": "select all orders",
                                    }}
                                />
                            </TableCell>
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
                                Order Date
                            </TableCell>
                            <TableCell
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    fontWeight: 500,
                                }}
                            >
                                Status
                            </TableCell>
                            <TableCell
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    fontWeight: 500,
                                }}
                            >
                                Invoiced
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((order) => {
                            const checked = selectedOrders.includes(order.id);
                            return (
                                <TableRow
                                    key={order.id}
                                    hover
                                    sx={{
                                        "&:nth-of-type(odd)": {
                                            backgroundColor:
                                                "background.default",
                                        },
                                        "& td": { py: 1 },
                                    }}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={checked}
                                            onChange={() =>
                                                handleSelectOrder(order.id)
                                            }
                                            inputProps={{
                                                "aria-label": `select order ${order.id}`,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>{order.id}</TableCell>
                                    <TableCell>
                                        {order.customerName ||
                                            order.customer?.name}
                                    </TableCell>
                                    <TableCell>
                                        {formatCustomDate(order?.orderDate)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={order.status}
                                            size="small"
                                            color={
                                                order.status === "COMPLETED"
                                                    ? "success"
                                                    : order.status ===
                                                        "IN_PROGRESS"
                                                        ? "info"
                                                        : order.status === "PENDING"
                                                            ? "warning"
                                                            : order.status ===
                                                                "CANCELLED"
                                                                ? "error"
                                                                : "default"
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {order.invoiced ? "Yes" : "No"}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedOrders.length > 0 && (
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleOpenConfirm}
                    sx={{ mt: 2 }}
                >
                    Generate Invoice
                </Button>
            )}

            {/* Confirmation Dialog for Invoice Generation */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Invoice Generation</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {/* Summary - glanceable */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "background.paper",
                                display: "flex",
                                flexDirection: "column",
                                gap: 1.25,
                            }}
                        >
                            <Typography variant="subtitle2" color="text.secondary">
                                Summary
                            </Typography>

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2">Orders Selected</Typography>
                                <Chip size="small" label={selectedOrders.length} />
                            </Stack>

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2">Period</Typography>
                                <Typography fontWeight={600}>
                                    {formatCustomDate(startDate)} – {formatCustomDate(endDate)}
                                </Typography>
                            </Stack>

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2">Invoice Date</Typography>
                                <Typography fontWeight={600}>
                                    {formatCustomDate(invoiceDate)}
                                </Typography>
                            </Stack>
                        </Paper>

                        {/* Invoice date selector */}
                        <DatePicker
                            label="Invoice Date"
                            value={invoiceDate}
                            onChange={(date) => setInvoiceDate(date)}
                            slotProps={{
                                textField: { fullWidth: true, size: "small", sx: INPUT_SX },
                            }}
                        />

                        {/* Tiny reassurance / clarity line */}
                        <Typography variant="caption" color="text.secondary">
                            You are about to generate invoices for <b>{selectedOrders.length}</b>{" "}
                            order{selectedOrders.length !== 1 ? "s" : ""} dated between{" "}
                            <b>{formatCustomDate(startDate)}</b> and <b>{formatCustomDate(endDate)}</b>.
                        </Typography>
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleConfirmGenerate} variant="contained" disabled={!invoiceDate}>
                        Generate
                    </Button>
                </DialogActions>
            </Dialog>

            <CustomSnackbar
                open={customSnackbarOpen}
                setOpen={setCustomSnackbarOpen}
                message={errorMessage}
                severity="error"
            />
        </Container>
    );
}

export default InvoiceGenerator;
