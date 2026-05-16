import React, { useState, useEffect, useCallback } from "react";
import {
    Container,
    Paper,
    Typography,
    TextField,
    MenuItem,
    Stack,
    Box,
    Autocomplete,
    Chip,
    TablePagination,
    IconButton,
    Button,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    TableChart as ExcelIcon,
    Refresh as RefreshIcon,
} from "@mui/icons-material";
import { keyframes } from "@mui/system";
import DataTable from "../common/tables/DataTable";
import StatusChip from "../common/StatusChip";
import GreenButton from "../common/GreenButton";
import InvoiceDetails from "./InvoiceDetails";
import AddPaymentDialog from "./AddPaymentDialog";
import InvoiceFormDialog from "./InvoiceFormDialog";
import ConfirmDialog from "../common/ConfirmDialog";
import CustomSnackbar from "../layout/CustomSnackbar";
import LoaderScreen from "../dashboard/LoaderScreen";
import { invoiceService } from "../../services/invoiceService";
import { customerService } from "../../services/customerService";
import { formatCustomDate, generateMonthOptions, getMonthRange } from "../../utils/dateUtils";
import { useGenerateInvoices } from "../../hooks/useBilling";

// ─── Filter options ─────────────────────────────────────────────
const STATUS_OPTIONS = [
    { label: "All", value: "" },
    { label: "Created", value: "CREATED" },
    { label: "Draft", value: "DRAFT" },
    { label: "Pending", value: "PENDING" },
    { label: "Sent", value: "SENT" },
    { label: "Paid", value: "PAID" },
    { label: "Partially Paid", value: "PARTIALLY_PAID" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "Overdue", value: "OVERDUE" },
    { label: "Invoiced", value: "INVOICED" },
    { label: "Voided", value: "VOIDED" },
    { label: "Not Invoiced", value: "NOT_INVOICED" },
];

const DIRECTION_OPTIONS = [
    { label: "All", value: "" },
    { label: "Receivable", value: "RECEIVABLE" },
    { label: "Payable", value: "PAYABLE" },
];

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const PAGE_SIZE = 20;

const MONTH_OPTIONS = generateMonthOptions();

// ─── Component ──────────────────────────────────────────────────
function InvoicesPage() {
    // Data
    const [invoices, setInvoices] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);

    // Filters (staged)
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [directionFilter, setDirectionFilter] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");

    // Applied filters (sent to API)
    const [appliedFilters, setAppliedFilters] = useState({});

    // Detail drawer
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Dialogs
    const [openFormDialog, setOpenFormDialog] = useState(false);
    const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Snackbar
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");

    const generateInvoicesMutation = useGenerateInvoices();

    // ─── Fetch invoices ─────────────────────────────────────────
    const fetchInvoices = useCallback(async (filters, pageNum) => {
        try {
            setLoading(true);
            const data = await invoiceService.getInvoices({
                ...filters,
                page: pageNum,
                size: PAGE_SIZE,
            });
            setInvoices(data?.content || []);
            setTotalElements(data?.totalElements || 0);
        } catch (error) {
            const msg =
                error.response?.data?.message || "Failed to fetch invoices.";
            setErrorMessage(msg);
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load + re-fetch on page / filter change
    useEffect(() => {
        fetchInvoices(appliedFilters, page);
    }, [appliedFilters, page, fetchInvoices]);

    // ─── Customer search ────────────────────────────────────────
    const fetchCustomers = async (query) => {
        if (!query || query.trim().length < 2) return;
        try {
            const data = await customerService.searchCustomersByName(query);
            setCustomers(Array.isArray(data) ? data : []);
        } catch (error) {
            const msg =
                error.response?.data?.message || "Failed to fetch customers.";
            setErrorMessage(msg);
            setSnackbarOpen(true);
        }
    };

    // ─── Filter actions ─────────────────────────────────────────
    const handleApplyFilters = () => {
        setPage(0);
        let start = undefined;
        let end = undefined;

        if (selectedMonth) {
            const { startAt, endAt } = getMonthRange(selectedMonth);
            start = startAt;
            end = endAt;
        }

        setAppliedFilters({
            billToId: selectedCustomer?.id || undefined,
            billToType: selectedCustomer ? "CUSTOMER" : undefined,
            status: statusFilter || undefined,
            invoiceDirection: directionFilter || undefined,
            startAt: start,
            endAt: end,
        });
    };

    // ─── CRUD helpers ───────────────────────────────────────────
    const handleSaveInvoice = async (invoiceData) => {
        try {
            if (selectedInvoice) {
                await invoiceService.updateInvoice(selectedInvoice.id, invoiceData);
            } else {
                await invoiceService.createInvoice(invoiceData);
            }
            setOpenFormDialog(false);
            fetchInvoices(appliedFilters, page);
        } catch (error) {
            const msg =
                error.response?.data?.message || "Failed to save invoice.";
            setErrorMessage(msg);
            setSnackbarOpen(true);
        }
    };

    const handleRequestDeleteInvoice = (row) => {
        setInvoiceToDelete(row);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        try {
            setDeleting(true);
            const result = await invoiceService.deleteInvoice(invoiceToDelete.id);
            setDeleteDialogOpen(false);
            setInvoiceToDelete(null);
            // Close detail drawer if the deleted invoice was open
            if (selectedInvoice?.id === invoiceToDelete.id) {
                setSelectedInvoice(null);
            }
            setSuccessMessage(result?.message || `Invoice ${invoiceToDelete.id} deleted successfully`);
            setSnackbarOpen(true);
            fetchInvoices(appliedFilters, page);
        } catch (error) {
            const msg =
                error.response?.data?.message || "Failed to delete invoice.";
            setErrorMessage(msg);
            setSnackbarOpen(true);
        } finally {
            setDeleting(false);
        }
    };

    const handleSavePayment = async (paymentData) => {
        try {
            await invoiceService.addPayment(selectedInvoice.id, paymentData);
            setOpenPaymentDialog(false);
            fetchInvoices(appliedFilters, page);
        } catch (error) {
            const msg =
                error.response?.data?.message || "Failed to save payment.";
            setErrorMessage(msg);
            setSnackbarOpen(true);
        }
    };

    // ─── Row click → detail drawer ──────────────────────────────
    const handleGenerateInvoices = async () => {
        try {
            const result = await generateInvoicesMutation.mutateAsync();
            setSuccessMessage(
                `Processed: ${result.processed}, Skipped: ${result.skipped}, Failed: ${result.failed}`
            );
            setSnackbarSeverity(result.failed > 0 ? "warning" : "success");
            setSnackbarOpen(true);
            fetchInvoices(appliedFilters, page);
        } catch (error) {
            setErrorMessage("Failed to generate invoices");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    // ─── Row click → detail drawer ──────────────────────────────
    const handleRowClick = (row) => {
        setSelectedInvoice(row);
    };

    // ─── Pagination ─────────────────────────────────────────────
    const handlePageChange = (_, newPage) => {
        setPage(newPage);
    };

    // ─── Column definitions ─────────────────────────────────────
    const columns = [
        {
            field: "invoiceNumber",
            headerName: "Invoice #",
            width: 120,
            render: (val) => <strong>{val}</strong>,
        },
        {
            field: "billToName",
            headerName: "Bill To",
            width: 100,
        },
        // {
        //     field: "invoiceDirection",
        //     headerName: "Direction",
        //     width: 100,
        //     render: (val) => (
        //         <Chip
        //             label={val === "RECEIVABLE" ? "Receivable" : "Payable"}
        //             size="small"
        //             color={val === "RECEIVABLE" ? "primary" : "secondary"}
        //             variant="outlined"
        //         />
        //     ),
        // },
        // {
        //     field: "issueDate",
        //     headerName: "Issue Date",
        //     width: 100,
        //     render: (val) => (val ? formatCustomDate(val) : "—"),
        // },
        {
            field: "dueDate",
            headerName: "Due Date",
            width: 100,
            render: (val) => (val ? formatCustomDate(val) : "—"),
        },
        {
            field: "grandTotal",
            headerName: "Grand Total",
            width: 100,
            render: (val) =>
                val !== null && val !== undefined ? `₹ ${val.toFixed(2)}` : "—",
        },
        // {
        //     field: "amountPaid",
        //     headerName: "Paid",
        //     width: 80,
        //     align: "right",
        //     render: (val) =>
        //         val !== null && val !== undefined ? `₹ ${val.toFixed(2)}` : "—",
        // },
        {
            field: "amountDue",
            headerName: "Due",
            width: 80,
            render: (val) =>
                val !== null && val !== undefined ? `₹ ${val.toFixed(2)}` : "—",
        },
        {
            field: "status",
            headerName: "Status",
            width: 30,
            render: (val) => <StatusChip status={val} />,
        },
        {
            field: "id",
            headerName: "Actions",
            width: 120,
            align: "center",
            stopPropagation: true,
            render: (_, row) => (
                <Stack direction="row" spacing={0.5} justifyContent="center">
                    <IconButton
                        size="small"
                        disabled={!row.pdfUrl}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(row.pdfUrl, "_blank");
                        }}
                        title="Download Invoice PDF"
                    >
                        <PdfIcon fontSize="small" color={row.pdfUrl ? "error" : "disabled"} />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={!row.annexureExcelUrl}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(row.annexureExcelUrl, "_blank");
                        }}
                        title="Download Annexure Excel"
                    >
                        <ExcelIcon fontSize="small" color={row.annexureExcelUrl ? "success" : "disabled"} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRequestDeleteInvoice(row);
                        }}
                        title="Delete Invoice"
                    >
                        <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                </Stack>
            ),
        },
    ];
    
    // ─── Render ─────────────────────────────────────────────────
    return (
        <Container maxWidth="lg" sx={{ py: 2 }}>
            {/* ── Filters Bar ─────────────────────────────────── */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: "bold" }}>
                    Invoice Management
                </Typography>

                <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                    <Autocomplete
                        options={customers}
                        getOptionLabel={(option) => option.name || ""}
                        value={selectedCustomer}
                        size="small"
                        onChange={(_, val) => setSelectedCustomer(val)}
                        onInputChange={(_, val) => fetchCustomers(val)}
                        sx={{ minWidth: 240 }}
                        renderInput={(params) => (
                            <TextField {...params} label="Customer" />
                        )}
                    />

                    <TextField
                        select
                        label="Status"
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 160 }}
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* <TextField
                        select
                        label="Direction"
                        size="small"
                        value={directionFilter}
                        onChange={(e) => setDirectionFilter(e.target.value)}
                        sx={{ minWidth: 150 }}
                    >
                        {DIRECTION_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField> */}

                    <TextField
                        select
                        label="Select Month"
                        size="small"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        sx={{ minWidth: 180 }}
                        SelectProps={{
                            MenuProps: {
                                PaperProps: {
                                    style: {
                                        maxHeight: 400,
                                    },
                                },
                            },
                        }}
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {MONTH_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <GreenButton
                        onClick={handleApplyFilters}
                    >
                        Apply
                    </GreenButton>

                    <Box sx={{ flexGrow: 1 }} />

                    <Button
                        variant="outlined"
                        startIcon={
                            <RefreshIcon
                                sx={{
                                    animation: generateInvoicesMutation.isPending
                                        ? `${spin} 1s linear infinite`
                                        : "none",
                                }}
                            />
                        }
                        onClick={handleGenerateInvoices}
                        disabled={generateInvoicesMutation.isPending}
                        sx={{
                            height: 40,
                            whiteSpace: "nowrap",
                            textTransform: "none",
                        }}
                    >
                        {generateInvoicesMutation.isPending ? "Generating..." : "Generate Invoices"}
                    </Button>
                </Stack>
            </Paper>

            {/* ── Data Table & Pagination ──────────────────────── */}
            {loading ? (
                <LoaderScreen />
            ) : (
                <>
                    <Paper sx={{ width: "100%" }}>
                        <DataTable
                            columns={columns}
                            rows={invoices}
                            onRowClick={handleRowClick}
                            selectedId={selectedInvoice?.id}
                        />
                    </Paper>

                    <TablePagination
                        component="div"
                        count={totalElements}
                        page={page}
                        onPageChange={handlePageChange}
                        rowsPerPage={PAGE_SIZE}
                        rowsPerPageOptions={[PAGE_SIZE]}
                    />
                </>
            )}

            {/* ── Detail Drawer ───────────────────────────────── */}
            <InvoiceDetails
                invoice={selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                onAddPayment={() => setOpenPaymentDialog(true)}
                onInvoiceUpdated={() => {
                    setSelectedInvoice(null);
                    fetchInvoices(appliedFilters, page);
                }}
            />

            {/* ── Payment Dialog ──────────────────────────────── */}
            <AddPaymentDialog
                open={openPaymentDialog}
                onClose={() => setOpenPaymentDialog(false)}
                onSave={handleSavePayment}
                remainingAmount={selectedInvoice?.amountDue ?? 0}
            />

            {/* ── Invoice Form Dialog ─────────────────────────── */}
            <InvoiceFormDialog
                open={openFormDialog}
                onClose={() => setOpenFormDialog(false)}
                onSave={handleSaveInvoice}
                invoice={selectedInvoice}
            />

            {/* ── Delete Invoice Confirm Dialog ───────────────── */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setInvoiceToDelete(null);
                }}
                onConfirm={handleConfirmDeleteInvoice}
                title="Delete Invoice"
                warning="This action is permanent and cannot be undone."
                message={`Are you sure you want to delete invoice ${invoiceToDelete?.invoiceNumber || invoiceToDelete?.id}? All associated payments and line items will be removed.`}
                confirmText="Delete"
                loading={deleting}
                loadingText="Deleting..."
            />

            {/* ── Snackbar ────────────────────────────────────── */}
            <CustomSnackbar
                open={snackbarOpen}
                onClose={() => {
                    setSnackbarOpen(false);
                    setErrorMessage("");
                    setSuccessMessage("");
                    setSnackbarSeverity("success");
                }}
                message={successMessage || errorMessage}
                severity={errorMessage ? "error" : snackbarSeverity}
                title={errorMessage ? "Error" : snackbarSeverity === "success" ? "Success" : "Warning"}
            />
        </Container>
    );
}

export default InvoicesPage;
