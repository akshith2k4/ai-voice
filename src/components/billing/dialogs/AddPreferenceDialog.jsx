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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format } from "date-fns";

import { useCreateBillingPreference, useUpdateBillingPreference } from "../../../hooks/useBilling";
import { customerService } from "../../../services/customerService";
import CustomSnackbar from "../../layout/CustomSnackbar";
const BILLING_TYPE_OPTIONS = ["FIXED", "USAGE_BASED", "WHICHEVER_IS_HIGHER"];
const BILL_TO_TYPE_OPTIONS = ["CUSTOMER", "VENDOR"];
const FREQUENCY_OPTIONS = [
  "WEEKLY",
  "BI_WEEKLY",
  "SEMI_MONTHLY",
  "MONTHLY",
  "CUSTOM_DAYS",
];
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE"];
const TIMEZONE_OPTIONS = [ "Asia/Kolkata", "Asia/Singapore"];
const initialFormState = {
  preferenceName: "",
  billToType: "CUSTOMER",
  frequency: "MONTHLY",
  cycleDurationDays: "",
  anchorDate: null,
  timezone: "Asia/Kolkata",
  status: "ACTIVE",
  notes: "",
  countryCode: "IN",
  creditDays: 0,
  billingType: "",
  fixedBillingAmount: "",
};

function AddPreferenceDialog({ open, onClose, onSuccess, preference }) {
  const createPreference = useCreateBillingPreference();
  const updatePreference = useUpdateBillingPreference();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isEdit = !!preference;

  useEffect(() => {
    if (open) {
      if (preference) {
        setFormData({
          ...initialFormState,
          ...preference,
          fixedBillingAmount: preference.fixedBillingAmount?.toString() || "",
          cycleDurationDays: preference.cycleDurationDays?.toString() || "",
          anchorDate: preference.anchorDate ? new Date(preference.anchorDate) : null,
        });
        setSelectedCustomer({
          id: preference.billToId,
          name: preference.billToName,
        });
        setCustomers([{
          id: preference.billToId,
          name: preference.billToName,
        }]);
      } else {
        setFormData(initialFormState);
        setSelectedCustomer(null);
        setCustomers([]);
      }
    }
  }, [open, preference]);

  const fetchCustomers = async (query) => {
    try {
      if (!query || query.trim().length < 2) return;
      const data = await customerService.searchCustomersByName(query);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleDateChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      anchorDate: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        billToId: selectedCustomer ? selectedCustomer.id : null,
        billToType: formData.billToType,
        billingType: formData.billingType,
        fixedBillingAmount: Number(formData.fixedBillingAmount),
        frequency: formData.frequency,
        cycleDurationDays:
          formData.frequency === "CUSTOM_DAYS"
            ? Number(formData.cycleDurationDays || 0)
            : 0,
        anchorDate: formData.anchorDate
          ? format(formData.anchorDate, "yyyy-MM-dd")
          : null,
        timezone: formData.timezone,
        creditDays: Number(formData.creditDays || 0),
        countryCode: formData.countryCode,
        status: formData.status,
      };

      if (isEdit) {
        await updatePreference.mutateAsync({
          id: preference.id,
          payload,
        });
      } else {
        await createPreference.mutateAsync(payload);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(`Failed to ${isEdit ? 'update' : 'create'} billing preference:`, error);
      const msg = error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} billing preference.`;
      setErrorMessage(msg);
      setSnackbarOpen(true);
    }
  };

  const isSubmitting = createPreference.isPending || updatePreference.isPending;

  const isFormValid =
    selectedCustomer &&
    // formData.preferenceName &&
    formData.billingType &&
    formData.fixedBillingAmount !== "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={false}
      maxWidth={false}
      PaperProps={{ sx: { width: 550, max: "auto" } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isEdit ? "Edit Billing Preference" : "Add Billing Preference"}
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        <Stack spacing={2}>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option?.name || ""}
            value={selectedCustomer}
            size="small"
            fullWidth
            onChange={(event, newValue) => {
              setSelectedCustomer(newValue);
            }}
            onInputChange={(event, newInputValue, reason) => {
              if (reason === "input") {
                fetchCustomers(newInputValue);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Customer"
                placeholder="Search Customer"
                sx={{ width: 500 }}
                size="small"
                required
              />
            )}
          />

          {/* <TextField
            label="Preference Name"
            placeholder="e.g. Linen Washing Weekly"
            value={formData.preferenceName}
            onChange={handleChange("preferenceName")}
            sx={{ width: 500 }}
            size="small"
            required
          /> */}


          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                select
                label="Billing Type"
                value={formData.billingType}
                onChange={handleChange("billingType")}
                sx={{ width: 240 }}
                size="small"
                required
              >
                {BILLING_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Fixed Billing Amount"
                type="number"
                value={formData.fixedBillingAmount}
                onChange={handleChange("fixedBillingAmount")}
                sx={{ width: 240 }}
                size="small"
                required
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                select
                label="Bill To Type"
                value={formData.billToType}
                onChange={handleChange("billToType")}
                sx={{ width: 240 }}
                size="small"
              >
                {BILL_TO_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                select
                label="Billing Frequency"
                value={formData.frequency}
                onChange={handleChange("frequency")}
                sx={{ width: 240 }}
                size="small"
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {formData.frequency === "CUSTOM_DAYS" && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Interval (days)"
                  type="number"
                  value={formData.cycleDurationDays}
                  onChange={handleChange("cycleDurationDays")}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={6}>
                <DatePicker
                  label="Start On"
                  value={formData.anchorDate}
                  onChange={handleDateChange}
                  slotProps={{
                    textField: { width: 500, size: "small" },
                  }}
                />
              </Grid>
            </Grid>
          )}

          {formData.frequency !== "CUSTOM_DAYS" && (
            <DatePicker
              label="Start On"
              value={formData.anchorDate}
              onChange={handleDateChange}
              slotProps={{
                textField: { width: 500, size: "small" },
              }}
            />
          )}

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Credit Days"
                type="number"
                value={formData.creditDays}
                onChange={handleChange("creditDays")}
                sx={{ width: 240 }}
                size="small"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                select
                label="Timezone"
                value={formData.timezone}
                onChange={handleChange("timezone")}
                sx={{ width: 240 }}
                size="small"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <MenuItem key={tz} value={tz}>
                    {tz}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                select
                label="Status"
                value={formData.status}
                onChange={handleChange("status")}
                sx={{ width: 240 }}
                size="small"
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <TextField
            label="Notes (optional)"
            value={formData.notes}
            onChange={handleChange("notes")}
            sx={{ width: 500 }}
            multiline
            minRows={1}
            size="small"
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
          {isEdit ? "Save Changes" : "Submit"}
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

export default AddPreferenceDialog;
