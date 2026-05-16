import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  TextField,
  Button,
} from "@mui/material";

/**
 * EditProductQuantitiesDialog
 * A reusable dialog for editing damaged/soiled quantities with simple validation.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - productName: string
 * - washed: number
 * - initialDamaged: number
 * - initialSoiled: number
 * - onSubmit: ({ damaged: number, soiled: number }) => Promise<any> | void
 */
function EditProductQuantitiesDialog({
  open,
  onClose,
  productName,
  washed = 0,
  initialDamaged = 0,
  initialSoiled = 0,
  onSubmit,
}) {
  const [damaged, setDamaged] = React.useState(initialDamaged || 0);
  const [soiled, setSoiled] = React.useState(initialSoiled || 0);
  const [saving, setSaving] = React.useState(false);

  // Reset local state whenever dialog is opened for a different product
  React.useEffect(() => {
    if (open) {
      setDamaged(Math.min(Math.max(0, Number(initialDamaged) || 0), Number(washed) || 0));
      setSoiled(Math.min(Math.max(0, Number(initialSoiled) || 0), Number(washed) || 0));
    }
  }, [open, initialDamaged, initialSoiled, washed]);

  const handleSave = async () => {
    const d = Math.min(Number.isFinite(Number(damaged)) ? Number(damaged) : 0, Number(washed) || 0);
    const s = Math.min(Number.isFinite(Number(soiled)) ? Number(soiled) : 0, Number(washed) || 0);
    try {
      setSaving(true);
      const ret = onSubmit ? onSubmit({ damaged: Math.max(0, d), soiled: Math.max(0, s) }) : undefined;
      if (ret && typeof ret.then === "function") {
        await ret;
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit quantities & Picture Upload</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" sx={{ mb: 3 }}>
          {productName || "Product"} ({washed ?? 0})
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
          <TextField
            label="Damaged qty"
            type="number"
            size="small"
            value={damaged}
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
              if (!Number.isFinite(v)) return;
              if (v < 0 || v > 99999) return;
              setDamaged(Math.min(v, Number(washed) || 0));
            }}
            inputProps={{ min: 0, max: washed || undefined }}
          />
          <TextField
            label="Soiled qty"
            type="number"
            size="small"
            value={soiled}
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
              if (!Number.isFinite(v)) return;
              if (v < 0 || v > 99999) return;
              setSoiled(Math.min(v, Number(washed) || 0));
            }}
            inputProps={{ min: 0, max: washed || undefined }}
          />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <div>Upload Image</div>
          <div>Upload Image</div>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" size="small" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" size="small" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditProductQuantitiesDialog;
