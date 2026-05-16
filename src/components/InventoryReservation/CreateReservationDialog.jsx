import { useState, useEffect, useCallback } from "react";
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
  initialData, // New prop for edit mode
}) {
  const [customerId, setCustomerId] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [reservationType, setReservationType] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [items, setItems] = useState([]);
  const [poolProducts, setPoolProducts] = useState({ id: "all", productItems: [] });
  // removed unused loadingProducts
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const isEditMode = Boolean(initialData);

  // Effect to populate form when initialData changes
  useEffect(() => {
    if (initialData) {
      setCustomerId(initialData.customerId);
      setSelectedCustomer({ id: initialData.customerId, name: initialData.customerName }); // Assuming customerName exists
      setReservationType(initialData.reservationType);
      setNotes(initialData.notes || "");
      setStartDate(initialData.startDate ? initialData.startDate.slice(0, 16) : "");
      setEndDate(initialData.endDate ? initialData.endDate.slice(0, 16) : "");

      // Select the pool
      if (initialData.poolId) {
        setPoolProducts(
          poolsWithProducts.find((pool) => pool.id === initialData.poolId) || {
            id: initialData.poolId, // Fallback if not found in list immediately
            productItems: [],
          }
        );
      }

      // Populate items
      if (initialData.items) {
        const transformedItems = initialData.items.map(item => ({
          ...item,
          quantityAllocatedWithDC: Number(item.totalReservedQuantity || 0) - Number(item.quantityAllocatedWithCustomer || 0)
        }));
        setItems(transformedItems);
      }
    } else {
      // Reset form for create mode
      setCustomerId("");
      setSelectedCustomer(null);
      setReservationType("");
      setNotes("");
      setStartDate("");
      setEndDate("");
      setItems([]);
      setPoolProducts({ id: "all", productItems: [] });
    }
  }, [initialData, poolsWithProducts]);

  const handlePoolChange = (newPoolId) => {
    setPoolProducts(
      poolsWithProducts.find((pool) => pool.id === newPoolId) || {
        id: "all",
        productItems: [],
      }
    );
  };

  const fetchCustomerOptions = async (searchTerm) => {
    try {
      const results = await customerService.searchCustomersByName(searchTerm);
      setCustomerOptions(results);
    } catch (error) {
      console.error("Error searching customers:", error);
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems((prevItems) =>
      prevItems.map((item, i) => {
        if (i !== index) return item;

        // apply change
        const updated = { ...item, [field]: value };

        // auto-calc quantityAllocatedWithDC when total or customer allocation changes
        const total = Number(updated.totalReservedQuantity) || 0;
        const withCustomer = Number(updated.quantityAllocatedWithCustomer) || 0;
        updated.quantityAllocatedWithDC = Math.max(0, total - withCustomer);

        return updated;
      })
    );
  };

  const handleSave = async () => {
    if (!customerId) {
      alert("Please select a customer.");
      return;
    }

    // Map UI items to API expected shape
    const mappedItems = items.map((it) => ({
      productId: it.productId,
      totalReservedQuantity: Number(it.totalReservedQuantity) || 0,
      quantityAllocatedWithCustomer:
        Number(it.quantityAllocatedWithCustomer) || 0,
      quantityAllocatedWithDC: Number(it.quantityAllocatedWithDC) || 0,
    }));

    const requestData = {
      customerId,
      reservationType: reservationType,
      notes,
      startDate,
      endDate,
      items: mappedItems,
      poolId: poolProducts.id ?? null,
      branchId: localStorage.getItem("branchId") || "default-branch-id",
    };

    try {
      if (isEditMode) {
        await inventoryService.updateReservation(initialData.id, requestData);
      } else {
        await inventoryService.createReservation(requestData, customerId);
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
    if (!customerId || isEditMode) return; // Don't auto-fetch in edit mode, as we want to show existing items

    try {
      const data = await agreementService.getActiveProductsForCustomer(
        customerId
      );
      setItems(data);
    } catch (error) {
      setItems([]);
      console.error("Error fetching active products for customer:", error);
    }
  }, [customerId, isEditMode]);

  const validatePoolProducts = useCallback(() => {
    if (!poolProducts.id) return;

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
      setPoolProducts({ id: "", productItems: [] });
    }
  }, [items, poolProducts]);

  // When customerId changes, fetch active products for that customer
  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  useEffect(() => {
    validatePoolProducts();
  }, [validatePoolProducts]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditMode ? "Edit Inventory Reservation" : "Create Inventory Reservation"}</DialogTitle>
      <Divider sx={{ mx: 3 }} />

      <DialogContent>
        <Box display={"flex"} gap={3} sx={{ my: 2 }}>
          <Box flex={1} item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Inventory Pool</InputLabel>
              <Select
                value={poolProducts.id || ""}
                onChange={(e) => handlePoolChange(e.target.value)}
              >
                {pools &&
                  pools.map((pool) => (
                    <MenuItem key={pool.id} value={pool.id}>
                      {pool.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          <Box flex={1} item xs={12} sm={12} fullWidth>
            <Autocomplete
              fullWidth
              options={customerOptions}
              getOptionLabel={(option) => option.name}
              value={selectedCustomer}
              onInputChange={(_, newInputValue) => {
                fetchCustomerOptions(newInputValue);
              }}
              onChange={(_, newValue) => {
                setSelectedCustomer(newValue);
                setCustomerId(newValue ? newValue.id : "");
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
          </Box>
          <Box flex={1} item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Reservation Type</InputLabel>
              <Select
                value={reservationType}
                onChange={(e) => setReservationType(e.target.value)}
              >
                <MenuItem value="FIXED">Fixed</MenuItem>
                <MenuItem value="FLEXIBLE">Flexible</MenuItem>
                <MenuItem value="ROTATIONAL">Rotational</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Box display={"flex"} gap={3} sx={{ mt: 2, width: "66.3%" }}>
          <Box flex={1} item xs={6} sx={{ mt: 1 }}>
            <TextField
              label="Start Date"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Box>
          <Box flex={1} item xs={6} sx={{ mt: 1 }}>
            <TextField
              label="End Date"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Box>
        </Box>
        <Box item xs={12} sx={{ mt: 2 }}>
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
                <Box flex={1} item xs={3}>
                  <Typography variant="body2">
                    <strong>
                      {index + 1}. {item.productName}
                    </strong>
                  </Typography>
                </Box>
                <Box flex={1} item xs={3}>
                  <TextField
                    label="Quantity"
                    type="number"
                    fullWidth
                    value={item.totalReservedQuantity}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "totalReservedQuantity",
                        e.target.value
                      )
                    }
                  />
                </Box>
                <Box flex={1} item xs={3}>
                  <TextField
                    label="Qty with Customer"
                    type="number"
                    fullWidth
                    value={item.quantityAllocatedWithCustomer}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "quantityAllocatedWithCustomer",
                        e.target.value
                      )
                    }
                  />
                </Box>
                <Box flex={1} item xs={3}>
                  <TextField
                    label="Qty with DC"
                    value={item.quantityAllocatedWithDC}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ readOnly: true }}
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
        <Box item xs={12} sx={{ mt: 2 }}>
          <TextField
            label="Notes"
            fullWidth
            value={notes}
            multiline
            minRows={2}
            sx={{
              "& .MuiOutlinedInput-root": {
                maxHeight: "none",
                height: "auto !important", // override global height
                overflow: "visible",
              },
            }}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
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
