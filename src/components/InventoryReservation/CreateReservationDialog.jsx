import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useCreateReservationAgent } from "../../useagent/useCreateReservationAgent";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Autocomplete,
  Snackbar,
  Divider,
} from "@mui/material";
import { inventoryService } from "../../services/inventoryService";
import { customerService } from "../../services/customerService";
import { agreementService } from "../../services/agreementService";

function CreateReservationDialog({
  open,
  onClose,
  onSave,
  pools,
  poolsWithProducts,
  initialData,
}) {
  const [customerOptions, setCustomerOptions] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const isEditMode = Boolean(initialData);

  const { control, handleSubmit, reset, setValue, getValues, watch } = useForm({
    defaultValues: {
      poolId: "",
      customer: null,
      reservationType: "",
      notes: "",
      startDate: "",
      endDate: "",
      items: [],
    }
  });

  const watchedPoolId = watch("poolId");
  const watchedCustomer = watch("customer");
  const customerId = watchedCustomer?.id || "";
  const reservationType = watch("reservationType");
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const notes = watch("notes");
  const items = watch("items") || [];

  const poolProducts = useMemo(() => {
    return poolsWithProducts.find((pool) => String(pool.id) === String(watchedPoolId)) || {
      id: "all",
      productItems: [],
    };
  }, [watchedPoolId, poolsWithProducts]);

  // Effect to populate form when initialData changes
  useEffect(() => {
    if (initialData) {
      const transformedItems = (initialData.items || []).map(item => ({
        ...item,
        quantityAllocatedWithDC: Number(item.totalReservedQuantity || 0) - Number(item.quantityAllocatedWithCustomer || 0)
      }));

      reset({
        poolId: initialData.poolId || "",
        customer: { id: initialData.customerId, name: initialData.customerName || `Customer ${initialData.customerId}` },
        reservationType: initialData.reservationType || "",
        notes: initialData.notes || "",
        startDate: initialData.startDate ? initialData.startDate.slice(0, 16) : "",
        endDate: initialData.endDate ? initialData.endDate.slice(0, 16) : "",
        items: transformedItems,
      });
    } else {
      reset({
        poolId: "",
        customer: null,
        reservationType: "",
        notes: "",
        startDate: "",
        endDate: "",
        items: [],
      });
    }
  }, [initialData, reset]);

  const fetchCustomerOptions = async (searchTerm) => {
    try {
      const results = await customerService.searchCustomersByName(searchTerm);
      setCustomerOptions(results);
    } catch (error) {
      console.error("Error searching customers:", error);
    }
  };

  const handleSave = async (data) => {
    const custId = data.customer?.id;
    if (!custId) {
      alert("Please select a customer.");
      return;
    }

    const mappedItems = (data.items || []).map((it) => ({
      productId: it.productId,
      totalReservedQuantity: Number(it.totalReservedQuantity) || 0,
      quantityAllocatedWithCustomer: Number(it.quantityAllocatedWithCustomer) || 0,
      quantityAllocatedWithDC: Number(it.quantityAllocatedWithDC) || 0,
    }));

    const requestData = {
      customerId: custId,
      reservationType: data.reservationType,
      notes: data.notes,
      startDate: data.startDate,
      endDate: data.endDate,
      items: mappedItems,
      poolId: data.poolId || null,
      branchId: localStorage.getItem("branchId") || "default-branch-id",
    };

    try {
      if (isEditMode) {
        await inventoryService.updateReservation(initialData.id, requestData);
      } else {
        await inventoryService.createReservation(requestData, custId);
      }
      onSave();
      onClose();
    } catch (error) {
      const backendMessage =
        error.response?.data?.message ||
        `Failed to ${isEditMode ? 'update' : 'create'} reservation. Please try again.`;
      setSnackbarMessage(backendMessage);
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const fetchActiveProducts = useCallback(async () => {
    if (!customerId || isEditMode) return;

    try {
      const data = await agreementService.getActiveProductsForCustomer(customerId);
      setValue("items", data);
    } catch (error) {
      setValue("items", []);
      console.error("Error fetching active products for customer:", error);
    }
  }, [customerId, isEditMode, setValue]);

  const validatePoolProducts = useCallback(() => {
    if (!poolProducts.id || poolProducts.id === "all") return;

    const availableIds = new Set(
      poolProducts.productItems.map((p) => String(p.productId))
    );

    const missingItems = items.filter(
      (it) => it.productId && !availableIds.has(String(it.productId))
    );

    if (missingItems.length > 0) {
      alert(
        "One or more selected items are not available in the chosen inventory pool."
      );
      setValue("poolId", "");
    }
  }, [items, poolProducts, setValue]);

  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  useEffect(() => {
    validatePoolProducts();
  }, [validatePoolProducts]);

  const resetForm = () => {
    reset({
      poolId: "",
      customer: null,
      reservationType: "",
      notes: "",
      startDate: "",
      endDate: "",
      items: [],
    });
  };

  useCreateReservationAgent({
    open,
    pools,
    customerOptions,
    fetchCustomerOptions,
    setValue,
    getValues,
    reset: resetForm,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditMode ? "Edit Inventory Reservation" : "Create Inventory Reservation"}</DialogTitle>
      <Divider sx={{ mx: 3 }} />

      <DialogContent>
        <Box display={"flex"} gap={3} sx={{ my: 2 }}>
          <Box flex={1}>
            <Controller
              name="poolId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Inventory Pool</InputLabel>
                  <Select
                    {...field}
                    value={field.value || ""}
                  >
                    {pools &&
                      pools.map((pool) => (
                        <MenuItem key={pool.id} value={pool.id}>
                          {pool.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            />
          </Box>
          <Box flex={1} fullWidth>
            <Controller
              name="customer"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  fullWidth
                  options={customerOptions}
                  getOptionLabel={(option) => option?.name || ""}
                  value={field.value}
                  onInputChange={(_, newInputValue) => {
                    fetchCustomerOptions(newInputValue);
                  }}
                  onChange={(_, newValue) => {
                    field.onChange(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Customer Name"
                      size="small"
                      fullWidth
                    />
                  )}
                />
              )}
            />
          </Box>
          <Box flex={1}>
            <Controller
              name="reservationType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Reservation Type</InputLabel>
                  <Select
                    {...field}
                    value={field.value || ""}
                  >
                    <MenuItem value="FIXED">Fixed</MenuItem>
                    <MenuItem value="FLEXIBLE">Flexible</MenuItem>
                    <MenuItem value="ROTATIONAL">Rotational</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>
        </Box>
        <Box display={"flex"} gap={3} sx={{ mt: 2, width: "66.3%" }}>
          <Box flex={1} sx={{ mt: 1 }}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Start Date"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
          </Box>
          <Box flex={1} sx={{ mt: 1 }}>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="End Date"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography>Items</Typography>
          {items.length > 0 ? (
            items.map((item, index) => (
              <Box
                display={"flex"}
                gap={1}
                key={index}
                alignItems="center"
                sx={{ my: 1 }}
              >
                <Box flex={1}>
                  <Typography variant="body2">
                    <strong>
                      {index + 1}. {item.productName}
                    </strong>
                  </Typography>
                </Box>
                <Box flex={1}>
                  <Controller
                    name={`items.${index}.totalReservedQuantity`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Quantity"
                        type="number"
                        fullWidth
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          const total = Number(e.target.value) || 0;
                          const withCustomer = Number(getValues(`items.${index}.quantityAllocatedWithCustomer`) || 0);
                          setValue(`items.${index}.quantityAllocatedWithDC`, Math.max(0, total - withCustomer));
                        }}
                      />
                    )}
                  />
                </Box>
                <Box flex={1}>
                  <Controller
                    name={`items.${index}.quantityAllocatedWithCustomer`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Qty with Customer"
                        type="number"
                        fullWidth
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          const total = Number(getValues(`items.${index}.totalReservedQuantity`) || 0);
                          const withCustomer = Number(e.target.value) || 0;
                          setValue(`items.${index}.quantityAllocatedWithDC`, Math.max(0, total - withCustomer));
                        }}
                      />
                    )}
                  />
                </Box>
                <Box flex={1}>
                  <Controller
                    name={`items.${index}.quantityAllocatedWithDC`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Qty with DC"
                        value={field.value ?? "0"}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  />
                </Box>
              </Box>
            ))
          ) : (
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ mt: 1, mb: 3 }}
            >
              No items found in the customer agreements.
            </Typography>
          )}
        </Box>
        <Box sx={{ mt: 2 }}>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notes"
                fullWidth
                multiline
                minRows={2}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    maxHeight: "none",
                    height: "auto !important",
                    overflow: "visible",
                  },
                }}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(handleSave)} variant="contained">
          Save
        </Button>
      </DialogActions>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        action={
          <Button color="inherit" size="small" onClick={handleSnackbarClose}>
            Close
          </Button>
        }
      />
    </Dialog>
  );
}

export default CreateReservationDialog;
