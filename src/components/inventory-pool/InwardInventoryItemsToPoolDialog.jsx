import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { useEffect, useMemo, useState } from "react";
import { inventoryService } from "../../services/inventoryService";

const TAB_LABELS = ["Single Item", "Range", "Multiple Items"];

function TabPanel({ value, index, children }) {
  if (value !== index) return null;

  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function InwardInventoryItemsToPoolDialog({
  open,
  onClose,
  onSave,
  product,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [singleId, setSingleId] = useState("");
  const [rangeStartId, setRangeStartId] = useState("");
  const [rangeCount, setRangeCount] = useState("");
  const [rangeEndId, setRangeEndId] = useState("");
  const [manualIds, setManualIds] = useState([""]);
  const [loading, setLoading] = useState(false);

  const poolSubtitle = useMemo(() => {
    if (!product?.poolName) return "";
    return `${product.poolName} Pool`;
  }, [product]);

  const resetForm = () => {
    setActiveTab(0);
    setSingleId("");
    setRangeStartId("");
    setRangeCount("");
    setRangeEndId("");
    setManualIds([""]);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  useEffect(() => {
    const start = parseInt(rangeStartId, 10);
    const count = parseInt(rangeCount, 10);

    if (Number.isFinite(start) && Number.isFinite(count) && count > 0) {
      setRangeEndId(String(start + count - 1));
    } else {
      setRangeEndId("");
    }
  }, [rangeStartId, rangeCount]);

  const handleAddManualId = () => {
    setManualIds((prev) => [...prev, ""]);
  };

  const handleRemoveManualId = (index) => {
    setManualIds((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleManualIdChange = (index, value) => {
    setManualIds((prev) =>
      prev.map((entry, idx) => (idx === index ? value : entry))
    );
  };

  const buildInventoryItemIds = () => {
    if (activeTab === 0) {
      const id = parseInt(singleId, 10);
      return Number.isFinite(id) ? [id] : [];
    }

    if (activeTab === 1) {
      const start = parseInt(rangeStartId, 10);
      const count = parseInt(rangeCount, 10);

      if (!Number.isFinite(start) || !Number.isFinite(count) || count <= 0) {
        return [];
      }

      const end = start + count - 1;
      const ids = [];
      for (let value = start; value <= end; value += 1) {
        ids.push(value);
      }
      return ids;
    }

    return manualIds
      .map((entry) => parseInt(entry, 10))
      .filter((value) => Number.isFinite(value));
  };

  const handleSubmit = async () => {
    const poolId = product?.poolId;
    if (!poolId) {
      alert("Pool ID is missing. Please re-open this dialog from a pool.");
      return;
    }

    const inventoryItemIds = buildInventoryItemIds();
    if (!inventoryItemIds.length) {
      alert("Please enter at least one inventory item ID.");
      return;
    }

    setLoading(true);
    try {
      const response = await inventoryService.inwardPoolItems(
        poolId,
        inventoryItemIds
      );
      if (onSave) {
        onSave(response);
      }
      handleClose();
    } catch (error) {
      console.error("Failed to inward inventory items", error);
      const message =
        error?.response?.data?.message || "Failed to inward inventory items";
      alert(message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Inward Inventory Items
        </Typography>
        {!!poolSubtitle && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            <em>{poolSubtitle}</em>
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              variant="fullWidth"
              TabIndicatorProps={{ sx: { height: 3, borderRadius: 2 } }}
            >
              {TAB_LABELS.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>

            <TabPanel value={activeTab} index={0}>
              <Stack spacing={2}>
                <TextField
                  label="Inventory Item ID"
                  type="number"
                  value={singleId}
                  onChange={(event) => setSingleId(event.target.value)}
                  fullWidth
                  inputProps={{ min: 1 }}
                />
              </Stack>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Start ID"
                    type="number"
                    value={rangeStartId}
                    onChange={(event) => setRangeStartId(event.target.value)}
                    fullWidth
                    inputProps={{ min: 1 }}
                  />
                  <TextField
                    label="End ID"
                    type="number"
                    value={rangeEndId}
                    fullWidth
                    disabled
                  />
                  <TextField
                    label="Range Count"
                    type="number"
                    value={rangeCount}
                    onChange={(event) => setRangeCount(event.target.value)}
                    fullWidth
                    inputProps={{ min: 1 }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  End ID is calculated from Start ID and Range Count.
                </Typography>
              </Stack>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Stack spacing={2}>
                {manualIds.map((value, index) => (
                  <Stack
                    key={`manual-id-${index}`}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                  >
                    <TextField
                      label={`Inventory Item ID ${index + 1}`}
                      type="number"
                      value={value}
                      onChange={(event) =>
                        handleManualIdChange(index, event.target.value)
                      }
                      fullWidth
                      inputProps={{ min: 1 }}
                    />
                    <IconButton
                      onClick={() => handleRemoveManualId(index)}
                      disabled={manualIds.length === 1}
                      aria-label="Remove item"
                      sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                    >
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddManualId}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Add Another ID
                </Button>
              </Stack>
            </TabPanel>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Inward Items"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
