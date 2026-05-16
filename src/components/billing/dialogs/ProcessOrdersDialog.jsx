import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Grid,
  Autocomplete,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { useProcessOrdersToBillable } from "../../../hooks/useBilling";
import { customerService } from "../../../services/customerService";
import CustomSnackbar from "../../layout/CustomSnackbar";

const BILL_TO_TYPE_OPTIONS = ["CUSTOMER", "VENDOR"];

function ProcessOrdersDialog({ open, onClose, onSuccess }) {
  const processOrders = useProcessOrdersToBillable();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [billToType, setBillToType] = useState("CUSTOMER");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [useAgreementPrice, setUseAgreementPrice] = useState(true);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedCustomer(null);
      setCustomers([]);
      setBillToType("CUSTOMER");
      setStartDate(null);
      setEndDate(null);
      setUseAgreementPrice(true);
    }
  }, [open]);

  const fetchCustomers = async (query) => {
    try {
      if (!query || query.trim().length < 2) return;
      const data = await customerService.searchCustomersByName(query);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const payload = {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        billToId: selectedCustomer.id,
        billToType,
        useAgreementPrice,
      };

      await processOrders.mutateAsync(payload);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to process orders:", error);
      const msg =
        error.response?.data?.message ||
        "Failed to process orders into billable items.";
      setErrorMessage(msg);
      setSnackbarOpen(true);
    }
  };

  const isSubmitting = processOrders.isPending;
  const isFormValid = selectedCustomer && startDate && endDate;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={false}
      maxWidth={false}
      PaperProps={{ sx: { width: 500 } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        Process Orders to Billable
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        <Stack spacing={2}>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option?.name || ""}
            value={selectedCustomer}
            size="small"
            fullWidth
            onChange={(_, newValue) => setSelectedCustomer(newValue)}
            onInputChange={(_, newInputValue, reason) => {
              if (reason === "input") {
                fetchCustomers(newInputValue);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Customer / Vendor"
                placeholder="Search by name"
                size="small"
                required
              />
            )}
          />

          <TextField
            select
            label="Bill To Type"
            value={billToType}
            onChange={(e) => setBillToType(e.target.value)}
            size="small"
            fullWidth
          >
            {BILL_TO_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(val) => setStartDate(val)}
                slotProps={{
                  textField: { size: "small", fullWidth: true, required: true },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(val) => setEndDate(val)}
                slotProps={{
                  textField: { size: "small", fullWidth: true, required: true },
                }}
              />
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Checkbox
                checked={useAgreementPrice}
                onChange={(e) => setUseAgreementPrice(e.target.checked)}
              />
            }
            label="Use Agreement Price"
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !isFormValid}
        >
          {isSubmitting ? "Processing..." : "Process Orders"}
        </Button>
      </DialogActions>

      <CustomSnackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        severity="error"
        message={errorMessage}
        title="Error"
      />
    </Dialog>
  );
}

export default ProcessOrdersDialog;
