import { useState} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Box,
} from "@mui/material";

const TRANSACTION_TYPES = [
  { value: "DELIVERY_FRESH", label: "Delivery Fresh" },
  { value: "PICKUP_SOILED", label: "Pickup Soiled" },
  { value: "PICKUP_HEAVY_SOILED", label: "Pickup Heavy Soiled" },
  { value: "PICKUP_DAMAGED", label: "Pickup Damaged" },
  { value: "RESERVED_FOR_CUSTOMER", label: "Reserved for Customer" },
  { value: "RECONCILE_CUSTOMER_STOCK ", label: "Reconcile Customer Stock" },
  { value: "RECONCILE_DC_STOCK", label: "Reconcile DC Stock" },
  { value: "OTHER", label: "Other" },
];

const INITIAL_FORM = {
  productId: "",
  transactionQuantity: "",
  transactionType: "",
  transactionTime: new Date().toISOString().slice(0, 16),
  remarks: "",
  transactionReferenceId: "",
};

function CreateTransactionDialog({
  products,
  open,
  onClose,
  onSave,
  saving,
  error,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [localError, setLocalError] = useState("");

  const handleSave = async () => {
    if (
      !form.productId ||
      !form.transactionQuantity ||
      !form.transactionType ||
      !form.transactionTime
    ) {
      setLocalError("Please fill all required fields.");
      return;
    }
    setLocalError("");
    await onSave(
      {
        productId: form.productId,
        transactionQuantity: Number(form.transactionQuantity),
        transactionType: form.transactionType,
        transactionTime: form.transactionTime,
        remarks: form.remarks,
        transactionReferenceId: form.transactionReferenceId
          ? Number(form.transactionReferenceId)
          : undefined,
      },
      resetForm
    );
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Transaction</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            select
            label="Product"
            value={form.productId}
            onChange={(e) =>
              setForm((f) => ({ ...f, productId: e.target.value }))
            }
            required
            fullWidth
          >
            {/* <MenuItem value="">Select Product</MenuItem> */}
            {products.map((p) => (
              <MenuItem key={p.productId} value={p.productId}>
                {p.productName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Transaction Type"
            value={form.transactionType}
            onChange={(e) =>
              setForm((f) => ({ ...f, transactionType: e.target.value }))
            }
            required
            fullWidth
          >
            {TRANSACTION_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Quantity"
            type="number"
            value={form.transactionQuantity}
            onChange={(e) =>
              setForm((f) => ({ ...f, transactionQuantity: e.target.value }))
            }
            required
            fullWidth
          />
          <TextField
            label="Transaction Time"
            type="datetime-local"
            value={form.transactionTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, transactionTime: e.target.value }))
            }
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Reference ID"
            value={form.transactionReferenceId}
            onChange={(e) =>
              setForm((f) => ({ ...f, transactionReferenceId: e.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Remarks"
            value={form.remarks}
            onChange={(e) =>
              setForm((f) => ({ ...f, remarks: e.target.value }))
            }
            fullWidth
          />
          {localError && (
            <Box sx={{ color: "error.main", fontSize: "0.9rem" }}>
              {localError}
            </Box>
          )}
          {error && (
            <Box sx={{ color: "error.main", fontSize: "0.9rem" }}>{error}</Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => {
            resetForm();
            onClose();
          }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateTransactionDialog;
