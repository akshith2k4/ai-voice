import React, { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  MenuItem,
  Stack,
  Box,
  Button,
  Autocomplete,
  TablePagination,
  IconButton,
} from "@mui/material";
import {
  TableChart as ExcelIcon,
} from "@mui/icons-material";

import DataTable from "../common/tables/DataTable";
import LoaderScreen from "../dashboard/LoaderScreen";
import StatusChip from "../common/StatusChip";
import GreenButton from "../common/GreenButton";
import { useBillingCycles, useBillingCycleAnnexureUrl } from "../../hooks/useBilling";
import { useQueryClient } from "@tanstack/react-query";
import { customerService } from "../../services/customerService";
import { formatCustomDate, generateMonthOptions, getMonthRange } from "../../utils/dateUtils";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import BillingCycleSidebar from "./drawers/BillingCycleSidebar";
import ProcessOrdersDialog from "./dialogs/ProcessOrdersDialog";
import CustomSnackbar from "../layout/CustomSnackbar";

// const BILLING_TYPE_OPTIONS = [
//   { label: "All", value: "" },
//   { label: "Weekly", value: 7 },
//   { label: "Monthly", value: 30 },
// ];

const BILLING_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "OPEN", value: "OPEN" },
  { label: "LOCKED", value: "LOCKED" },
  { label: "INVOICED", value: "INVOICED" },
  { label: "EMPTY", value: "EMPTY" },
];



const MONTH_OPTIONS = generateMonthOptions();

function BillingCycle() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [billingTypeFilter, setBillingTypeFilter] = useState("");
  const [billingStatusFilter, setBillingStatusFilter] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const queryClient = useQueryClient();
  const getAnnexureUrlMutation = useBillingCycleAnnexureUrl();

  const [appliedFilters, setAppliedFilters] = useState({
    billToId: undefined,
    billToType: undefined,
    billingType: undefined,
    status: undefined,
    invoiceStatus: undefined,
    startAt: undefined,
    endAt: undefined,
  });


  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const { data, isLoading } = useBillingCycles({
    billToId: appliedFilters.billToId,
    billToType: appliedFilters.billToType,
    billingType: appliedFilters.billingType,
    status: appliedFilters.status,
    invoiceStatus: appliedFilters.invoiceStatus,
    startAt: appliedFilters.startAt,
    endAt: appliedFilters.endAt,
    page,
    size: pageSize,
  });

  const billingCycles = data?.items || [];
  const totalItems = data?.totalElements || 0;

  const fetchCustomers = async (query) => {
    if (!query || query.trim().length < 2) return;
    const res = await customerService.searchCustomersByName(query);
    setCustomers(Array.isArray(res) ? res : []);
  };

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
      billToId: selectedCustomer?.id,
      billToType: selectedCustomer ? "CUSTOMER" : undefined,
      billingType: billingTypeFilter || undefined,
      status: billingStatusFilter || undefined,
      invoiceStatus: invoiceStatusFilter || undefined,
      startAt: start,
      endAt: end,
    });
  };

  const handleRowClick = (row) => {
    setSelectedCycle(row);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedCycle(null);
  };

  const handleCycleDeleted = () => {
    setSidebarOpen(false);
    setSelectedCycle(null);
    queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
  };

  const handlePageChange = (_, newPage) => {
    setPage(newPage);
  };

  const handleDownloadAnnexure = async (id) => {
    try {
      const response = await getAnnexureUrlMutation.mutateAsync(id);
      if (response && response.annexureExcelUrl) {
        window.open(response.annexureExcelUrl, "_blank");
      } else {
        setSnackbarMessage("No annexure URL found for this billing cycle.");
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage("Failed to get annexure URL.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const columns = [
    { field: "cycleId", headerName: "Cycle ID", type: "id" },
    { 
      field: "billToName", 
      headerName: "Name", 
      type: "longText",
      render: (val) => <strong>{val}</strong> 
    },
    {
      field: "startDate",
      headerName: "Start Date",
      type: "shortText",
      render: (val) => (val ? formatCustomDate(val) : "—"),
      tooltipVal: (val) => (val ? formatCustomDate(val) : "—"),
    },
    {
      field: "endDate",
      headerName: "End Date",
      type: "shortText",
      render: (val) => (val ? formatCustomDate(val) : "—"),
      tooltipVal: (val) => (val ? formatCustomDate(val) : "—"),
    },
    // {
    //   field: "billingType",
    //   headerName: "Billing Type",
    //   width: 20,
    //   render: (_, row) =>
    //     row.cycleDurationDays === 7 ? "Weekly" : "Monthly",
    // },
    {
      field: "status",
      headerName: "Status",
      type: "shortText",
      render: (val) => <StatusChip status={val} />,
    },
    {
      field: "totalBillableAmount",
      headerName: "Total Amount",
      type: "shortText",
      render: (val) =>
        val !== null && val !== undefined ? `₹ ${Number(val).toLocaleString("en-IN")}` : "—",
      tooltipVal: (val) =>
        val !== null && val !== undefined ? `₹ ${Number(val).toLocaleString("en-IN")}` : "—",
    },
    {
      field: "invoiceStatus",
      headerName: "Invoice Status",
      type: "shortText",
      render: (val) => <StatusChip status={val || "N/A"} />,
    },
    {
      headerName: "Actions",
      type: "shortText",
      align: "center",
      render: (_, row) => (
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadAnnexure(row.cycleId);
            }}
            title="Download Annexure Excel"
          >
            <ExcelIcon 
              fontSize="small" 
              color="success"
              sx={{ 
                animation: getAnnexureUrlMutation.isPending && getAnnexureUrlMutation.variables === row.cycleId ? "spin 1s linear infinite" : "none" 
              }} 
            />
          </IconButton>
        </Stack>
      ),
    },
  ];

  if (isLoading) return <LoaderScreen />;

  
  return (
    <>
      <Paper sx={{ p: 1.5, mb: 2, width: "98.5%" }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.name || ""}
            value={selectedCustomer}
            size="small"
            onChange={(e, val) => setSelectedCustomer(val)}
            onInputChange={(e, val) => fetchCustomers(val)}
            sx={{ minWidth: 260 }}
            renderInput={(params) => (
              <TextField {...params} label="Customer Name" />
            )}
          />
          {/* <TextField
            select
            label="Billing Type"
            size="small"
            value={billingTypeFilter}
            onChange={(e) => setBillingTypeFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {BILLING_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField> */}

          <TextField
            select
            label="Billing Status"
            size="small"
            value={billingStatusFilter}
            onChange={(e) => setBillingStatusFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {BILLING_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Select Month"
            size="small"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            sx={{ minWidth: 200 }}
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
            variant="contained"
            startIcon={<AutoFixHighIcon />}
            onClick={() => setProcessDialogOpen(true)}
            sx={{
              height: 40,
              whiteSpace: "nowrap",
              textTransform: "none",
            }}
          >
            Process Orders
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ mb: 2 }}>
        <Paper sx={{ width: "100%" }}>
          <DataTable
            columns={columns}
            rows={billingCycles}
            onRowClick={handleRowClick}
          />
        </Paper>
      </Box>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalItems}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[pageSize]}
      />

      <BillingCycleSidebar
        open={sidebarOpen}
        cycle={selectedCycle}
        loading={false}
        onClose={handleCloseSidebar}
        onDeleted={handleCycleDeleted}
      />

      <ProcessOrdersDialog
        open={processDialogOpen}
        onClose={() => setProcessDialogOpen(false)}
        onSuccess={() => {
          setProcessDialogOpen(false);
          setSnackbarMessage("Orders processed into billable items successfully!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />

      <CustomSnackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        severity={snackbarSeverity}
        message={snackbarMessage}
        title={snackbarSeverity === "success" ? "Success" : snackbarSeverity === "warning" ? "Warning" : "Error"}
      />
      </>
    
  );
}

export default BillingCycle;