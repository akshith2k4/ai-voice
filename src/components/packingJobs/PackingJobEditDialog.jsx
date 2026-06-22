import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import { productService } from "../../services/productService";

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const getProductLabel = (product) =>
  product?.name || product?.productName || `Product ${product?.id ?? product?.productId ?? ""}`;

const getProductId = (product) => product?.id ?? product?.productId;

export default function PackingJobEditDialog({ open, job, saving, onClose, onSave }) {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setError("");
    setRows(flattenAllocations(job?.productItems || []));

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const productData = await productService.getAllProducts();
        setProducts(asArray(productData));
      } catch (err) {
        console.error("Failed to load products", err);
        setError("Failed to load products.");
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [open, job]);

  const productById = useMemo(
    () => new Map(products.map((product) => [String(getProductId(product)), product])),
    [products],
  );

  const updateRow = (rowId, patch) => {
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    );
  };

  const duplicateRow = (index) => {
    setRows((prev) => {
      const source = prev[index];
      if (!source) return prev;
      const next = {
        ...source,
        rowId: `${source.rowId}-copy-${Date.now()}`,
      };
      return [...prev.slice(0, index + 1), next, ...prev.slice(index + 1)];
    });
  };

  const handleSave = () => {
    try {
      const payload = buildPayload(rows);
      setError("");
      onSave(payload);
    } catch (err) {
      setError(err?.message || "Fix product rows before saving.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Packing Job</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Edit product details and packing quantity requirements for {job?.jobNumber || "this packing job"}.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={1}>
          {rows.map((row, index) => (
            <Box
              key={row.rowId}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(220px, 1.5fr) 160px 80px",
                },
                gap: 2,
                alignItems: "center",
              }}
            >
              <Autocomplete
                options={products}
                loading={loadingOptions}
                value={productById.get(String(row.productId)) || null}
                getOptionLabel={getProductLabel}
                isOptionEqualToValue={(option, value) =>
                  String(getProductId(option)) === String(getProductId(value))
                }
                onChange={(_, value) =>
                  updateRow(row.rowId, { productId: getProductId(value) || "" })
                }
                renderInput={(params) => (
                  <TextField {...params} size="small" label="Product" />
                )}
              />
              <TextField
                size="small"
                label="Packing Qty"
                type="number"
                value={row.packingQuantity}
                onChange={(event) =>
                  updateRow(row.rowId, { packingQuantity: event.target.value })
                }
                inputProps={{ min: 1 }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <IconButton size="small" onClick={() => duplicateRow(index)}>
                  <AddCircleOutlineIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() =>
                    setRows((prev) => prev.filter((item) => item.rowId !== row.rowId))
                  }
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function flattenAllocations(productItems) {
  return asArray(productItems).map((item, itemIndex) => ({
    rowId: `${item.id || item.referenceItemId || itemIndex}`,
    referenceItemType: item.referenceItemType,
    referenceItemId: item.referenceItemId,
    notes: item.notes || "",
    productId: item.productId ?? "",
    packingQuantity: item.packingQuantity ?? item.requiredQuantity ?? "",
  }));
}

function buildPayload(rows) {
  if (rows.length === 0) {
    throw new Error("At least one product row is required.");
  }

  const productItems = rows.map((row) => {
    const productId = Number(row.productId);
    const packingQuantity = Number(row.packingQuantity);

    if (!Number.isFinite(productId) || !Number.isFinite(packingQuantity) || packingQuantity <= 0) {
      throw new Error("Product and positive packing quantity are required for every row.");
    }

    return {
      referenceItemType: row.referenceItemType || undefined,
      referenceItemId: row.referenceItemId || undefined,
      productId,
      packingQuantity,
      notes: row.notes || undefined,
    };
  });

  return { productItems };
}
