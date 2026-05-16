import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  MenuItem,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useEffect, useState } from "react";
import { inventoryService } from "../../services/inventoryService";
import QuantityScanInput from "../Scanner/QuantityScanInput";


// const QUANTITY_TYPES = ["FRESH", "SOILED", "HEAVY_SOILED", "DAMAGED"];

const INITIAL_FORM = {
  quantity: "",
  transactionType: "DELIVERY_FRESH",
  transactionTime: new Date(),
  referenceId: "",
  remarks: "",
};

export default function AddTransactionDialog({ product, onSave, open, onClose }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [inventoryIds, setInventoryIds] = useState([]);
 const handleChange = (key, value) => {
  setForm((prev) => ({
    ...prev,
    [key]: value,
  }));
};

  const handleSubmit = async () => {
    if (!form.quantity || !product.poolId || !product.productId) {
      alert("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        poolProductItemId: product.productId,
        transactionQuantity: parseInt(form.quantity),
        // quantityType: form.quantityType,
        transactionType: form.transactionType,
        transactionTime: form.transactionTime,
        transactionReferenceId: form.referenceId,
        remarks: form.remarks,
      };

      const response = await inventoryService.createPoolTransaction(product.poolId, payload);

      onSave(response);
      onClose();

    } catch (error) {
      console.error("Failed to create transaction:", error);
      const message = error.response?.data?.message || "Failed to create transaction";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const data = await inventoryService.getTransactionTypes();
        setTransactionTypes(data);
      } catch (error) {
        console.error("Failed to fetch transaction types:", error);
      }
    };

    fetchTypes();
  }, []);
  useEffect(() => {
  if (open) {
    setForm(INITIAL_FORM);
    setInventoryIds([]);
  }
}, [open]);


  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Add Transaction
        </Typography>

        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          <strong>{product.productName}</strong> — <em>{product.poolName} Pool</em>
        </Typography>
      </DialogTitle>


      <DialogContent dividers sx={{ pt: 3 }}>
        <Stack spacing={3}>
          {/* Transaction Type Dropdown */}
          <TextField
            select
            label="Transaction Type"
            value={form.transactionType}
            onChange={(e) => handleChange("transactionType", e.target.value)}
            fullWidth
            required
          >
            {transactionTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          {/* Quantity Input */}
      <QuantityScanInput
  label="Quantity"
  value={form.quantity || 0}
  showMax={false}
  quantityType="OVERALL"
  referenceId={product.poolId}
  productId={product.productId}
  fieldWidth="100%"
  onChange={(val) => handleChange("quantity", val)}
  onScanMessage={(scanEvent) => {
    if (!scanEvent) return;

    const scannedInventoryItemId = scanEvent.inventoryItemId;
    const scannedProductId = scanEvent.productId;

    if (!scannedInventoryItemId || !scannedProductId) return;

    if (scannedProductId !== product.productId) return;

    setInventoryIds((prevIds) => {
      if (prevIds.includes(scannedInventoryItemId)) {
        return prevIds;
      }

      const updatedIds = [...prevIds, scannedInventoryItemId];

      setForm((prevForm) => ({
        ...prevForm,
        quantity: updatedIds.length,
      }));

      return updatedIds;
    });
  }}
/>



          {/* Quantity Type Dropdown */}
          {/* <TextField
            select
            label="Quantity Type"
            value={form.quantityType}
            onChange={(e) => handleChange("quantityType", e.target.value)}
            fullWidth
            required
          >
            {QUANTITY_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField> */}

          {/* Date & Time */}
          <DateTimePicker
            label="Transaction Time & Date"
            value={form.transactionTime || new Date()}
            onChange={(value) => handleChange("transactionTime", value ?? new Date())}
            sx={{ width: "100%" }}
          />

          {/* Reference ID */}
          <TextField
            label="Reference ID (optional)"
            value={form.referenceId}
            onChange={(e) => handleChange("referenceId", e.target.value)}
            fullWidth
          />

          {/* Remarks Input */}
          <TextField
            label="Remarks (optional)"
            value={form.remarks}
            onChange={(e) => handleChange("remarks", e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{
              '& .MuiOutlinedInput-root': {
                maxHeight: 'none',
                height: 'auto !important',   // override global height
                overflow: 'visible',
              },
            }}

          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
