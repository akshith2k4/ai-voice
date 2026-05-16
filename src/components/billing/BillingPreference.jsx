import React, { useState } from "react";
import {
  Paper,
  Button,
  TextField,
  Autocomplete,
  Box,
  TablePagination,
  IconButton,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";

import DataTable from "../common/tables/DataTable";
import LoaderScreen from "../dashboard/LoaderScreen";
import StatusChip from "../common/StatusChip";
import { useBillingPreferences } from "../../hooks/useBilling";
import { customerService } from "../../services/customerService";
import { formatCustomDate } from "../../utils/dateUtils";
import BillingPreferenceSidebar from "./drawers/BillingPreferenceSidebar";
import AddPreferenceDialog from "./dialogs/AddPreferenceDialog";
import CustomSnackbar from "../layout/CustomSnackbar";

function BillingPreference() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedPreference, setSelectedPreference] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  const { data, isLoading } = useBillingPreferences({
    billToId: selectedCustomer?.id, 
    billToType: selectedCustomer ? "CUSTOMER" : undefined,
    page,
    size: pageSize,
  });

  const billingPreferences = data?.items || [];
  const totalItems = data?.totalElements || 0;

  const fetchCustomers = async (query) => {
    if (!query || query.trim().length < 2) return;
    const res = await customerService.searchCustomersByName(query);
    setCustomers(Array.isArray(res) ? res : []);
  };

  const handleRowClick = (row) => {
    setSelectedPreference(row);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    // setSelectedPreference(null);
  };

  const handlePageChange = (_, newPage) => {
    setPage(newPage);
  };

  const columns = [
    {
      field: "billToName",
      headerName: "Customer",
      width: 140,
      render: (val) => <strong>{val}</strong>,
    },
    /* {
      field: "preferenceName",
      headerName: "Preference Name",
      width: 120,
      render: (val) => val || "Leasing Orders",
    }, */
    {
      field: "billingType",
      headerName: "Billing Type",
      width: 130,
      render: (val) => val || "USAGE_BASED",
    },
    {
      field: "fixedBillingAmount",
      headerName: "Fixed Amount",
      width: 100,
      render: (val) =>
        val !== null && val !== undefined ? `₹ ${val}` : "—",
    },
    {
      field: "frequency",
      headerName: "Billing Duration",
      width: 120,
      render: (val, row) => {
        if (val === "CUSTOM_DAYS" || !val) return `Custom: ${row.cycleDurationDays} Days`;
        return val;
      },
    },
    {
      field: "creditDays",
      headerName: "Credit Days",
      width: 100,
      render: (val) => val || 0,
    },
    // {
    //   field: "anchorDate",
    //   headerName: "Next Billing Date",
    //   width: 100,
    //   render: (val) => (val ? formatCustomDate(val) : "—"),
    // },
    {
      field: "status",
      headerName: "Status",
      width: 60,
      render: (val) => <StatusChip status={val} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      align: "center",
      render: (_, row) => (
        <IconButton
          color="primary"
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedPreference(row);
            setAddDialogOpen(true);
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  if (isLoading) return <LoaderScreen />;

  return (
    <>
      <Paper sx={{ p: 1.5, mb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            gap: 2,
          }}
        >
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.name || ""}
            value={selectedCustomer}
            size="small"
            onChange={(_, newValue) =>
              setSelectedCustomer(newValue)
            }
            onInputChange={(_, newInputValue) =>
              fetchCustomers(newInputValue)
            }
            sx={{ minWidth: 260 }}
            renderInput={(params) => (
              <TextField {...params} label="Customer Name" />
            )}
          />

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedPreference(null);
              setAddDialogOpen(true);
            }}
            sx={{
              height: 40,
              whiteSpace: "nowrap",
              textTransform: "none",
            }}
          >
            Add Preference
          </Button>
        </Box>
      </Paper>

      <DataTable
        columns={columns}
        rows={Array.isArray(billingPreferences) ? billingPreferences : []}
        onRowClick={handleRowClick}
        selectedId={selectedPreference?.id}
      />

      <TablePagination
        component="div"
        count={totalItems}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[pageSize]}
      />

      <BillingPreferenceSidebar
        open={sidebarOpen}
        preference={selectedPreference}
        loading={false}
        onClose={handleCloseSidebar}
      />

      <AddPreferenceDialog
        open={addDialogOpen}
        preference={selectedPreference}
        onClose={() => {
          setAddDialogOpen(false);
          setSelectedPreference(null);
        }}
        onSuccess={() => {
          setAddDialogOpen(false);
          const isEdit = !!selectedPreference;
          setSnackbarMessage(`Billing Preference ${isEdit ? "updated" : "created"} successfully!`);
          setSnackbarOpen(true);
          setSelectedPreference(null);
        }}
      />

      <CustomSnackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        severity="success"
        message={snackbarMessage}
        title="Success"
      />
    </>
  );
}

export default BillingPreference;