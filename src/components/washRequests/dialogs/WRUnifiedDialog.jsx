import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Skeleton,
  Chip,
  Tooltip,
  Divider,
  Fade,
  Checkbox,
  IconButton,
} from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
// Removed add/remove icons for RE_WASH static list
import { useCreateWashRequestAgent } from "../../../useagent/useCreateWashRequestAgent";
import { laundryVendorService } from "../../../services/laundryVendorService";
import { inventoryService } from "../../../services/inventoryService";
import { soiledService } from "../../../services/soiledService";
import { washRequestService } from "../../../services/washRequestService";
import { productService } from "../../../services/productService";
import { useDcid } from "../../../context/DcidContext";
import ScannerHeader from "../../Scanner/ScannerHeader";
import QuantityScanInput from "../../Scanner/QuantityScanInput";
import ColumnScanHeaderAction from "../../Scanner/ColumnScanHeaderAction";
import { scannerController } from "../../Scanner/ScannerController";

/* ---------- helpers ---------- */
const toLocalDateOnly = (date) => {
  try {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return null;
  }
};
const normalizeDateTime = (dt) => {
  if (!dt) return null;
  return dt.length === 16 ? `${dt}:00` : dt;
};
const formatDeliveryDateParam = (dateStr) => {
  if (!dateStr) return "";
  return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
};

// Returns current local date formatted for <input type="date"> (YYYY-MM-DD)
const nowLocalDate = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * One dialog. Two modes. Mode now chosen via left-side dropdown (WASH / RE_WASH).
 *
 * Props:
 * - open: boolean
 * - mode: "wash" | "rewash" (optional initial)
 * - onModeChange: (nextMode) => void (optional)
 * - onClose: () => void
 * - onSuccess: () => void
 *
 */

// Valid item condition types for RFID scan data
const ITEM_CONDITION_TYPES = [
  "FRESH",
  "SOILED",
  "DAMAGED",
  "HEAVY_SOILED",
  "DIRTY",
  "MISSING",
  "OTHER",
];

export default function WRUnifiedDialog({
  open,
  mode: externalMode = "wash",
  onModeChange = () => {},
  onClose,
  onSuccess,
}) {
  const { dcid } = useDcid();
  // When true, user manually edited WR date; stop auto-linking to Trips Date
  const [wrDateTouched, setWrDateTouched] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [pools, setPools] = useState([]);
  const [products, setProducts] = useState([]); // for RE_WASH dropdown

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // 🔥 scanner states
  const [scanStatus, setScanStatus] = useState("INACTIVE");
  const [activeScan, setActiveScan] = useState(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [scanPreview, setScanPreview] = useState([]);
  const [scannedInventoryIds, setScannedInventoryIds] = useState(new Set());
  const [showWashScannerHeader, setShowWashScannerHeader] = useState(false);
  const [showRewashScannerHeader, setShowRewashScannerHeader] = useState(false);

  // local mode state driven by dropdown (keeps BC with parent via onModeChange)
  const [mode, setMode] = useState(externalMode); // "wash" | "rewash"
  useEffect(() => {
    setMode(externalMode);
  }, [externalMode, open]);

  useEffect(() => {
    if (open) return;
    setScanStatus("INACTIVE");
    setActiveScan(null);
    setScannedCount(0);
    setScanPreview([]);
    setScannedInventoryIds(new Set());
    setShowWashScannerHeader(false);
    setShowRewashScannerHeader(false);
  }, [open]);

  const { control, setValue, getValues, watch, reset } = useForm({
    defaultValues: {
      vendorId: "",
      poolId: "",
      deliveryDate: "",
      washRequestRecordedDateTime: nowLocalDate(),
      notes: "",
      washRequestType: "WASH",
      manual: true,
    }
  });

  const formData = watch();

  const { poolId, vendorId, deliveryDate, washRequestType } = formData;

  // rows per mode
  const [washRows, setWashRows] = useState([]);
  const [rewashRows, setRewashRows] = useState([]);

  const [loading, setLoading] = useState({
    vendors: false,
    pools: false,
    products: false,
    fetchSoiled: false,
    submit: false,
  });

  const vendorName = useMemo(
    () =>
      vendors.find((v) => String(v.id) === String(formData.vendorId))?.name ||
      "",
    [vendors, formData.vendorId],
  );
  const poolName = useMemo(
    () =>
      pools.find((p) => String(p.id) === String(formData.poolId))?.name || "",
    [pools, formData.poolId],
  );

  // derive mode from dropdown value (single source of truth)
  useEffect(() => {
    const nextMode = washRequestType === "RE_WASH" ? "rewash" : "wash";
    setMode(nextMode);
    onModeChange?.(nextMode);
  }, [washRequestType]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentRows = mode === "wash" ? washRows : rewashRows;

  const totalRequestedQty = useMemo(() => {
    if (mode === "rewash") {
      return rewashRows.reduce((acc, r) => acc + (Number(r.requested) || 0), 0);
    }
    return washRows.reduce((acc, r) => acc + (Number(r.requested) || 0), 0);
  }, [mode, washRows, rewashRows]);

  const canSubmit = useMemo(
    () =>
      !!formData.vendorId &&
      !!formData.poolId &&
      !!formData.deliveryDate &&
      !!formData.washRequestRecordedDateTime &&
      !loading.submit,
    [formData, loading.submit],
  );

  /* ---------- effects ---------- */
  useEffect(() => {
    if (!open) return;
    setError("");
    setInfo("");
    setWrDateTouched(false);

    (async () => {
      setLoading((s) => ({ ...s, vendors: true }));
      try {
        const data = await laundryVendorService.getAllVendors();
        setVendors(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("Failed to load vendors.");
      } finally {
        setLoading((s) => ({ ...s, vendors: false }));
      }
    })();

    (async () => {
      setLoading((s) => ({ ...s, pools: true }));
      try {
        const data = await inventoryService.getPools();
        setPools(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError((prev) => prev || "Failed to load inventory pools.");
      } finally {
        setLoading((s) => ({ ...s, pools: false }));
      }
    })();

    (async () => {
      setLoading((s) => ({ ...s, products: true }));
      try {
        const data = await productService.getAllProducts();
        const mapped = Array.isArray(data)
          ? data
              .filter((p) => p && (p.name || p.productName))
              .map((p) => ({
                id: p.id ?? p.productId,
                name: p.name ?? p.productName,
              }))
          : [];
        setProducts(mapped);
      } catch (e) {
        console.error(e);
        setError((prev) => prev || "Failed to load products.");
      } finally {
        setLoading((s) => ({ ...s, products: false }));
      }
    })();
  }, [open]);

  // Load warehouses for showing current dc label in disabled dropdown
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const list = await inventoryService.getWarehouses();
        setWarehouses(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("Failed to load warehouses", e);
      }
    })();
  }, [open]);

  // Auto-fetch soiled quantities for WASH mode when required fields change
  useEffect(() => {
    if (!open) return;
    if (mode !== "wash") return;
    if (!poolId || !vendorId || !deliveryDate) return;

    const fetchSoiled = async () => {
      setError("");
      setInfo("");
      setWashRows([]);
      setLoading((s) => ({ ...s, fetchSoiled: true }));
      try {
        const payload = {
          poolId: Number(poolId),
          vendorId: Number(vendorId),
          deliveryDate: formatDeliveryDateParam(deliveryDate),
        };
        const res = await soiledService.getSoiledQuantities(payload);
        const mapped = (res || [])
          .filter((x) => x && (x.productId || x.productName))
          .map((x) => ({
            productId: x.productId ?? x.id ?? x.code ?? Math.random(),
            productName: x.productName || `Product`,
            available: Number(x.soiledQuantity) || 0,
            requested: 0,
            heavySoiled: 0,
            soiledItems: [],
          }));
        setWashRows(mapped);
        if (!mapped.length)
          setInfo("No soiled quantities returned for this selection.");
      } catch (e) {
        console.error(e);
        setError("Failed to fetch soiled quantities.");
      } finally {
        setLoading((s) => ({ ...s, fetchSoiled: false }));
      }
    };

    fetchSoiled();
  }, [open, mode, poolId, vendorId, deliveryDate]);

  // ---------- Quantity UX helpers (match CreateOrderDialog) ----------
  // Keep only digits; allow empty while typing; strip leading zeros (but keep a single "0")
  const normalizeQtyInput = (raw) => {
    if (raw === "") return "";
    const digitsOnly = String(raw).replace(/\D/g, "");
    if (digitsOnly === "") return "";
    return digitsOnly.replace(/^0+(?=\d)/, "");
  };

  // Finalize before submit: convert ""/null to 0; else to Number >= 0
  const finalizeQtyForSubmit = (q) => {
    if (q === "" || q == null) return 0;
    const n = Number(q);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  // Build rewash rows from product list, preserving any existing qty
  const buildRewashRowsFromProducts = useCallback(
    (existing = []) => {
      const existingMap = new Map(
        existing.map((r) => [
          String(r.productId),
          { requested: Number(r.requested) || 0 },
        ]),
      );
      return (products || []).map((p) => {
        const key = String(p.id);
        const prev = existingMap.get(key);
        return {
          productId: p.id,
          productName: p.name,
          requested: prev ? prev.requested : 0,
        };
      });
    },
    [products],
  );

  // Populate RE_WASH rows when we switch to rewash or products are loaded
  useEffect(() => {
    if (!open) return;
    if (mode !== "rewash") return;
    if (loading.products) return;

    setRewashRows((prev) => buildRewashRowsFromProducts(prev));
  }, [open, mode, loading.products, products, buildRewashRowsFromProducts]);

  /* ---------- handlers ---------- */
  const handleChange = (key) => (e) => {
    const val = e.target.value;
    setValue(key, val);
    // Link WR date to Trips Date while WR date hasn't been manually edited
    if (key === "deliveryDate" && !wrDateTouched) {
      setValue("washRequestRecordedDateTime", val);
    }
    if (key === "washRequestRecordedDateTime") {
      // User touched WR date; break the link going forward
      setWrDateTouched(true);
    }
  };

  const handleRequestTypeChange = (e) => {
    const val = e.target.value; // "WASH" | "RE_WASH"
    setValue("washRequestType", val);
    // clear info/errors and rows when switching type
    setInfo("");
    setError("");
    if (val === "WASH") {
      setRewashRows([]);
    } else {
      setWashRows([]);
      // initialize rewash list with all products
      setRewashRows((prev) => buildRewashRowsFromProducts(prev));
    }
  };

  const resetAll = useCallback(() => {
    reset({
      vendorId: "",
      poolId: "",
      deliveryDate: "",
      washRequestRecordedDateTime: nowLocalDate(),
      notes: "",
      washRequestType: "WASH",
      manual: true,
    });
    setWrDateTouched(false);
    setWashRows([]);
    setRewashRows([]);
    setError("");
    setInfo("");
    setLoading({
      vendors: false,
      pools: false,
      products: false,
      fetchSoiled: false,
      submit: false,
    });
    setMode("wash");
    setScanStatus("INACTIVE");
    setActiveScan(null);
    setScannedCount(0);
    setScanPreview([]);
    setScannedInventoryIds(new Set());
    setShowWashScannerHeader(false);
    setShowRewashScannerHeader(false);
  }, [reset]);

  const handleClose = async (...args) => {
    try {
      await scannerController.cancel();
    } catch (e) {
      console.error("Failed to cancel scanner session on dialog close", e);
    } finally {
      resetAll();
      onClose?.(...args);
    }
  };

  // wash mutations
  const changeWashRequestedInput = (productId, raw) => {
    const next = normalizeQtyInput(raw);
    setWashRows((prev) =>
      prev.map((r) =>
        r.productId === productId ? { ...r, requested: next } : r,
      ),
    );
  };

  // rewash mutations
  const _updateRewashRow = (index, patch) =>
    setRewashRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );

  const handleSubmit = async () => {
    setError("");
    setInfo("");
    setLoading((s) => ({ ...s, submit: true }));
    try {
      let productSoiledItems = [];
      if (mode === "wash") {
        productSoiledItems = washRows.map((r) => {
          const finalized = finalizeQtyForSubmit(r.requested);
          const heavySoiledFinal = finalizeQtyForSubmit(r.heavySoiled || 0);
          return {
            productId: r.productId,
            soiledQuantity: finalized,
            washedQuantity: 0,
            heavySoiledQuantity: heavySoiledFinal,
            soiledItems: r.soiledItems || [],
          };
        });
      } else {
        productSoiledItems = rewashRows
          .filter((r) => !!r.productId)
          .map((r) => ({
            productId: r.productId,
            soiledQuantity: finalizeQtyForSubmit(r.requested),
            washedQuantity: 0,
            soiledItems: r.soiledItems || [],
          }));
      }

      const body = {
        manual: formData.manual,
        referenceId: Number(formData.poolId),
        referenceType: "INVENTORY_POOL",
        laundryVendorId: Number(formData.vendorId),
        washRequestRecordedDateTime: normalizeDateTime(
          formData.washRequestRecordedDateTime,
        ),
        notes:
          mode === "rewash"
            ? formData.notes || "(Rewash)"
            : formData.notes || "",
        productSoiledItems,
        // IMPORTANT: send exactly what backend expects
        washRequestType: formData.washRequestType, // "WASH" | "RE_WASH"
      };

      await washRequestService.create(body);
      onSuccess?.();
      await handleClose();
    } catch (e) {
      console.error(e);
      setError("Failed to create request.");
    } finally {
      setLoading((s) => ({ ...s, submit: false }));
    }
  };

  const handleRfidWashScanEvent = (scanEvent, conditionTypeDefault = "SOILED") => {
    if (!scanEvent) return;

    // Parse WebSocket data: handle both array of items and single item formats
    const scannedItems = Array.isArray(scanEvent.results?.items)
      ? scanEvent.results.items
      : Array.isArray(scanEvent.scannedTags)
      ? scanEvent.scannedTags
      : scanEvent.inventoryItemId
      ? [scanEvent]
      : [];

    const validItems = scannedItems.filter(
      (item) => item.inventoryItemId || item.rfidTag,
    );

    if (!validItems.length) return;

    setWashRows((prevRows) => {
      const newSet = new Set(scannedInventoryIds);

      const updatedRows = prevRows.map((row) => {
        let increment = 0;
        let heavySoiledIncrement = 0;
        const newSoiledItems = [...(row.soiledItems || [])];

        validItems.forEach((item) => {
          // Match by productId from scanned item
          if (
            item.productId === row.productId &&
            (item.inventoryItemId || item.rfidTag)
          ) {
            const invId = item.inventoryItemId || item.rfidTag;
            // Use provided condition type or extract from item
            const conditionType =
              item.itemConditionType ||
              item.conditionType ||
              item.condition ||
              conditionTypeDefault;

            const validatedConditionType = ITEM_CONDITION_TYPES.includes(conditionType)
              ? conditionType
              : conditionTypeDefault;

            // Create unique key combining referenceId and itemConditionType
            const uniqueKey = `${invId}:${validatedConditionType}`;

            // Check if this combination already exists in soiledItems
            const alreadyExists = newSoiledItems.some(
              (si) => si.referenceId === invId && si.itemConditionType === validatedConditionType
            );

            if (!alreadyExists && !newSet.has(uniqueKey)) {
              newSet.add(uniqueKey);
              
              // Track increment separately for requested vs heavy soiled
              if (conditionTypeDefault === "HEAVY_SOILED") {
                heavySoiledIncrement++;
              } else {
                increment++;
              }

              // Add to soiledItems array with proper RFID data
              newSoiledItems.push({
                referenceId: invId,
                referenceType: "INVENTORY_ITEM",
                notes: item.notes || item.note || "",
                itemConditionType: validatedConditionType,
              });
            }
          }
        });

        if (increment === 0 && heavySoiledIncrement === 0) return row;

        // Update UI scan preview
        const itemsToPreview = validItems.filter(
          (item) => {
            if (item.productId !== row.productId) return false;
            const invId = item.inventoryItemId || item.rfidTag;
            const conditionType = item.itemConditionType || item.conditionType || item.condition || conditionTypeDefault;
            const validatedConditionType = ITEM_CONDITION_TYPES.includes(conditionType) ? conditionType : conditionTypeDefault;
            return newSet.has(`${invId}:${validatedConditionType}`);
          }
        );

        setScanPreview((prev) =>
          [
            ...itemsToPreview.map((item) => ({
              id: item.inventoryItemId || item.rfidTag,
              productName: item.productName || row.productName,
              scanType: "WASH_REQUEST_CREATION",
              quantityType: conditionTypeDefault === "HEAVY_SOILED" ? "HEAVY_SOILED" : "SOILED",
            })),
            ...prev,
          ].slice(0, 20)
        );

        return {
          ...row,
          requested: 
            increment > 0
              ? (Number(row.requested) || 0) + increment
              : row.requested,
          heavySoiled:
            heavySoiledIncrement > 0
              ? (Number(row.heavySoiled) || 0) + heavySoiledIncrement
              : row.heavySoiled,
          soiledItems: newSoiledItems,
        };
      });

      setScannedInventoryIds(newSet);
      setScannedCount(newSet.size);

      return updatedRows;
    });
  };

  const handleRfidRewashSessionEvent = (scanEvent) => {
    if (!scanEvent) return;

    // Parse WebSocket data: handle both array of items and single item formats
    const scannedItems = Array.isArray(scanEvent.results?.items)
      ? scanEvent.results.items
      : Array.isArray(scanEvent.scannedTags)
      ? scanEvent.scannedTags
      : scanEvent.inventoryItemId
      ? [scanEvent]
      : [];

    const validItems = scannedItems.filter(
      (item) => item.inventoryItemId || item.rfidTag,
    );

    if (!validItems.length) return;

    setRewashRows((prevRows) => {
      const newSet = new Set(scannedInventoryIds);

      const updatedRows = prevRows.map((row) => {
        let increment = 0;
        const newSoiledItems = [...(row.soiledItems || [])];

        validItems.forEach((item) => {
          // Match by productId if available, or add to all rows if no productId
          if (
            (item.productId === row.productId || !item.productId) &&
            (item.inventoryItemId || item.rfidTag)
          ) {
            const invId = item.inventoryItemId || item.rfidTag;
            const conditionType =
              item.itemConditionType ||
              item.conditionType ||
              item.condition ||
              "SOILED";

            const validatedConditionType = ITEM_CONDITION_TYPES.includes(conditionType)
              ? conditionType
              : "SOILED";

            // Create unique key combining referenceId and itemConditionType
            const uniqueKey = `${invId}:${validatedConditionType}`;

            // Check if this combination already exists in soiledItems
            const alreadyExists = newSoiledItems.some(
              (si) => si.referenceId === invId && si.itemConditionType === validatedConditionType
            );

            if (!alreadyExists && !newSet.has(uniqueKey)) {
              newSet.add(uniqueKey);
              increment++;

              // Add to soiledItems array with proper RFID data
              newSoiledItems.push({
                referenceId: invId,
                referenceType: "INVENTORY_ITEM",
                notes: item.notes || item.note || "",
                itemConditionType: validatedConditionType,
              });
            }
          }
        });

        if (increment === 0) return row;

        // Update UI scan preview
        const itemsToPreview = validItems.filter(
          (item) => {
            const invId = item.inventoryItemId || item.rfidTag;
            const conditionType = item.itemConditionType || item.conditionType || item.condition || "SOILED";
            const validatedConditionType = ITEM_CONDITION_TYPES.includes(conditionType) ? conditionType : "SOILED";
            return (item.productId === row.productId || !item.productId) && newSet.has(`${invId}:${validatedConditionType}`);
          }
        );

        setScanPreview((prev) =>
          [
            ...itemsToPreview.map((item) => ({
              id: item.inventoryItemId || item.rfidTag,
              productName: item.productName || `Product ${row.productId}`,
              scanType: "WASH_REQUEST_CREATION",
              quantityType: "SOILED",
            })),
            ...prev,
          ].slice(0, 20)
        );

        return {
          ...row,
          requested: (Number(row.requested) || 0) + increment,
          soiledItems: newSoiledItems,
        };
      });

      setScannedInventoryIds(newSet);
      setScannedCount(newSet.size);

      return updatedRows;
    });
  };
  /* ---------- UI ---------- */
  const Header = (
    <DialogTitle sx={{ pb: 0.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <span>
          {mode === "wash" ? "Create Wash Request" : "Create Rewash Request"}
        </span>
      </Stack>
    </DialogTitle>
  );

  const LeftPanel = (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2.5,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Filters & Request Details
      </Typography>
      <Stack spacing={2.25}>
        {/* NEW: Request Type dropdown (manager requirement) */}
        <TextField
          select
          fullWidth
          size="small"
          label="Request Type"
          name="washRequestType"
          value={formData.washRequestType}
          onChange={handleRequestTypeChange}
          required
        >
          <MenuItem value="WASH">Wash</MenuItem>
          <MenuItem value="RE_WASH">Re-Wash</MenuItem>
        </TextField>

        {/* Disabled Warehouse bound to dcid */}
        <TextField
          select
          fullWidth
          size="small"
          label="Warehouse"
          name="warehouse"
          value={dcid ?? ""}
          disabled
        >
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>
              {w.name || `Warehouse ${w.id}`}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          size="small"
          label="Vendor"
          name="vendor"
          value={formData.vendorId}
          onChange={handleChange("vendorId")}
          disabled={loading.vendors}
          required
        >
          <MenuItem value="">{loading.vendors ? "Loading…" : "—"}</MenuItem>
          {!loading.vendors &&
            vendors.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.name}
              </MenuItem>
            ))}
        </TextField>

        <TextField
          select
          fullWidth
          size="small"
          label="Inventory Pool"
          name="pool"
          value={formData.poolId}
          onChange={handleChange("poolId")}
          disabled={loading.pools}
          required
        >
          <MenuItem value="">{loading.pools ? "Loading…" : "—"}</MenuItem>
          {!loading.pools &&
            pools.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
        </TextField>

        <TextField
          fullWidth
          size="small"
          type="date"
          label="Trips Date"
          name="deliveryDate"
          InputLabelProps={{ shrink: true }}
          value={formData.deliveryDate}
          onChange={handleChange("deliveryDate")}
          required
        />

        <TextField
          fullWidth
          size="small"
          type="datetime-local"
          label="Wash Request Date & Time"
          name="washRequestRecordedDateTime"
          InputLabelProps={{ shrink: true }}
          value={formData.washRequestRecordedDateTime}
          onChange={handleChange("washRequestRecordedDateTime")}
          required
        />

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <Checkbox
            size="small"
            name="manual"
            checked={formData.manual}
            onChange={(e) => setValue("manual", e.target.checked)}
          />
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>Manual / Direct Transfer (Bypass Trip Creation)</Typography>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <TextField
          fullWidth
          size="small"
          label="Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange("notes")}
          placeholder="Any instructions (optional)"
          sx={{ mt: 0.5 }}
        />
      </Stack>
    </Box>
  );

  const RightPanelWash = (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        bgcolor: "background.paper",
        minHeight: 520,
        maxHeight: 800,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: "auto" }}>
          Soiled Quantities
        </Typography>
        <Chip
          color="primary"
          variant="outlined"
          label={`Total Qty: ${totalRequestedQty}`}
          size="small"
        />
      </Box>

      {mode === "wash" && showWashScannerHeader && (
        <Box sx={{ mb: 1 }}>
          <ScannerHeader
            status={scanStatus === "ACTIVE" ? "ACTIVE" : "IDLE"}
            scannedCount={scannedCount}
            scanPreview={scanPreview}
            onCancel={() => {
              resetAll();
            }}
          />
        </Box>
      )}

      <Divider sx={{ mb: 1 }} />

      {loading.fetchSoiled ? (
        <Box sx={{ p: 1, display: "grid", gap: 1.5 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Box>
      ) : washRows.length === 0 ? (
        <Box
          sx={{
            p: 3,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            textAlign: "center",
            bgcolor: "background.default",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Load soiled quantities to view and edit product quantities.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            overflow: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            boxShadow: 2,
            bgcolor: "background.paper",
          }}
        >
          {/* Sticky header */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "32px 1fr 100px 120px",
                md: "32px 1fr 130px 140px",
              },

              gap: 1,
              position: "sticky",
              top: 0,
              zIndex: 2,
              bgcolor: "background.default",
              borderBottom: "1px solid",
              borderColor: "divider",
              py: 1,
              px: 2,
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              backdropFilter: "blur(4px)",
            }}
          >
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ pl: 0.5 }}
            >
              Product
            </Typography>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textAlign: "right" }}
            >
              Available
            </Typography>
            <ColumnScanHeaderAction
              label="Requested"
              quantityType="WASH"
              referenceId={formData.poolId}
              scanType="WASH_REQUEST_CREATION"
              onScanStart={(ctx) => {
                setActiveScan(ctx);
                setShowWashScannerHeader(true);
                setScanStatus("ACTIVE");
              }}
              onScanStop={() => {
                setActiveScan(null);
                setScanStatus("IDLE");
              }}
              onScanMessage={(scanEvent) =>
                handleRfidWashScanEvent(scanEvent, "SOILED")
              }
            />
            <ColumnScanHeaderAction
              label="Heavy Soiled"
              quantityType="HEAVY_SOILED"
              referenceId={formData.poolId}
              scanType="WASH_REQUEST_CREATION"
              onScanStart={(ctx) => {
                setActiveScan(ctx);
                setShowWashScannerHeader(true);
                setScanStatus("ACTIVE");
              }}
              onScanStop={() => {
                setActiveScan(null);
                setScanStatus("IDLE");
              }}
              onScanMessage={(scanEvent) =>
                handleRfidWashScanEvent(scanEvent, "HEAVY_SOILED")
              }
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridAutoRows: "minmax(52px, auto)",
              mt: 0.5,
            }}
          >
            {washRows.map((r, idx) => (
              <Box
                key={r.productId}
                data-agent-row-wash={idx}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr 84px 100px 110px",
                    md: "1fr 120px 130px 140px",
                  },
                  gap: 1,
                  alignItems: "center",
                  px: 2,
                  py: 0.25,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  transition: "background-color 0.2s ease",
                  bgcolor: idx % 2 === 1 ? "action.hover" : "transparent",
                  "&:hover": {
                    bgcolor: "action.selected",
                  },
                }}
              >
                <Typography
                  variant="body2"
                  noWrap
                  title={r.productName}
                  sx={{
                    pr: 1,
                    fontWeight: 500,
                    color: "text.primary",
                  }}
                >
                  {r.productName}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    color: "text.secondary",
                  }}
                >
                  {r.available}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }} data-agent-field="requested">
                  <QuantityScanInput
                    value={r.requested ?? ""}
                    onChange={(val) =>
                      changeWashRequestedInput(r.productId, val)
                    }
                    quantityType="WASH"
                    scanType="WASH_REQUEST_CREATION"
                    referenceId={formData.poolId}
                    productId={r.productId}
                    inventoryItemIds={(r.soiledItems || []).filter(si => si.itemConditionType !== "HEAVY_SOILED").map(si => si.referenceId).filter(Boolean)}
                    isScanning={
                      scanStatus === "ACTIVE" &&
                      activeScan?.referenceId === formData.poolId &&
                      (activeScan?.productId === r.productId ||
                        activeScan?.productId == null)
                    }
                    onScanStart={(ctx) => {
                      setActiveScan(ctx);
                      setShowWashScannerHeader(true);
                      setScanStatus("ACTIVE");
                    }}
                    onScanStop={() => {
                      setActiveScan(null);
                      setScanStatus("IDLE");
                    }}
                    onScanMessage={(scanEvent) =>
                      handleRfidWashScanEvent(scanEvent, "SOILED")
                    }
                  />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }} data-agent-field="heavySoiled">
                  <QuantityScanInput
                    value={r.heavySoiled ?? ""}
                    onChange={(val) =>
                      setWashRows((prev) =>
                        prev.map((row) =>
                          row.productId === r.productId
                            ? { ...row, heavySoiled: val }
                            : row,
                        ),
                      )
                    }
                    quantityType="HEAVY_SOILED"
                    scanType="WASH_REQUEST_CREATION"
                    referenceId={formData.poolId}
                    productId={r.productId}
                    inventoryItemIds={(r.soiledItems || []).filter(si => si.itemConditionType === "HEAVY_SOILED").map(si => si.referenceId).filter(Boolean)}
                    isScanning={
                      scanStatus === "ACTIVE" &&
                      activeScan?.referenceId === formData.poolId &&
                      (activeScan?.productId === r.productId ||
                        activeScan?.productId == null)
                    }
                    onScanStart={(ctx) => {
                      setActiveScan(ctx);
                      setShowWashScannerHeader(true);
                      setScanStatus("ACTIVE");
                    }}
                    onScanStop={() => {
                      setActiveScan(null);
                      setScanStatus("IDLE");
                    }}
                    onScanMessage={(scanEvent) =>
                      handleRfidWashScanEvent(scanEvent, "HEAVY_SOILED")
                    }
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );

  const RightPanelRewash = (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        bgcolor: "background.paper",
        minHeight: 320,
        maxHeight: 520,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: "auto" }}>
          Rewash Items
        </Typography>
        <Chip
          color="primary"
          variant="outlined"
          label={`Total Qty: ${totalRequestedQty}`}
          size="small"
        />
      </Box>
      {mode === "rewash" && showRewashScannerHeader && (
        <Box sx={{ mb: 1 }}>
          <ScannerHeader
            status={scanStatus === "ACTIVE" ? "ACTIVE" : "IDLE"}
            scannedCount={scannedCount}
            scanPreview={scanPreview}
            onCancel={() => {
              resetAll();
            }}
          />
        </Box>
      )}
      <Divider sx={{ mb: 1 }} />

      {/* Header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 140px", md: "1fr 160px" },
          gap: 1,
          position: "sticky",
          top: 0,
          zIndex: 1,
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
          py: 1,
          px: 1,
          boxShadow: 1,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Product
        </Typography>

  <ColumnScanHeaderAction
    label="Quantity"
    quantityType="RE_WASH"
    referenceId={formData.poolId}
    scanType="WASH_REQUEST_CREATION"
    onScanStart={(ctx) => {
      setActiveScan(ctx);
      setShowRewashScannerHeader(true);
      setScanStatus("ACTIVE");
    }}
    onScanStop={() => {
      setActiveScan(null);
      setScanStatus("IDLE");
    }}
    onScanMessage={handleRfidRewashSessionEvent}
  />
</Box>


      <Box sx={{ overflow: "auto", mt: 0.5 }}>
        {loading.products ? (
          <Box sx={{ p: 1, display: "grid", gap: 1.5 }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={56} />
            ))}
          </Box>
        ) : rewashRows.length === 0 ? (
          <Box
            sx={{
              p: 3,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              textAlign: "center",
              bgcolor: "background.default",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No products available.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridAutoRows: "minmax(52px, auto)" }}>
            {rewashRows.map((r, idx) => (
              <Box
                key={r.productId}
                data-agent-row-rewash={idx}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 140px", md: "1fr 160px" },
                  gap: 1,
                  alignItems: "center",
                  px: 1,
                  py: 1,
                  borderRadius: 1,
                  ...(idx % 2 === 1 ? { bgcolor: "action.hover" } : {}),
                  "&:hover": { bgcolor: "action.selected" },
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" noWrap title={r.productName}>
                    {r.productName}
                  </Typography>
                </Box>

                <Box data-agent-field="requested" sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <QuantityScanInput
                    value={r.requested ?? 0}
                    onChange={(val) =>
                      _updateRewashRow(idx, { requested: val })
                    }
                    showMax={false}
                    quantityType="OVERALL"
                    scanType="WASH_REQUEST_CREATION"
                    referenceId={formData.poolId}
                    productId={r.productId}
                    inventoryItemIds={(r.soiledItems || []).map(si => si.referenceId).filter(Boolean)}
                    isScanning={
                      scanStatus === "ACTIVE" &&
                      activeScan?.referenceId === formData.poolId &&
                      (activeScan?.productId === r.productId ||
                        activeScan?.productId == null)
                    }
                    onScanStart={(ctx) => {
                      setActiveScan(ctx);
                      setShowRewashScannerHeader(true);
                      setScanStatus("ACTIVE");
                    }}
                    onScanStop={() => {
                      setActiveScan(null);
                      setScanStatus("INACTIVE");
                    }}
                    onScanMessage={handleRfidRewashSessionEvent}
                  />
                </Box>

                <Box />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );

  const SummaryBar = (
    <DialogActions
      sx={{
        position: { md: "sticky" },
        bottom: 0,
        zIndex: 1,
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        py: 1,
        px: 2,
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Chip
          color="primary"
          variant="outlined"
          label={`Products: ${currentRows.length}`}
          size="small"
        />
        <Chip
          color="primary"
          variant="outlined"
          label={`Total Qty: ${totalRequestedQty}`}
          size="small"
        />
        {vendorName && <Chip label={`Vendor: ${vendorName}`} size="small" />}
        {poolName && <Chip label={`Pool: ${poolName}`} size="small" />}
        {formData.deliveryDate && (
          <Chip
            label={`Date: ${toLocalDateOnly(formData.deliveryDate) || formData.deliveryDate}`}
            size="small"
          />
        )}
        <Chip
          label={`Type: ${formData.washRequestType}`}
          size="small"
          color="secondary"
          variant="outlined"
        />
      </Box>

      <Button
        onClick={handleClose}
        disabled={loading.submit}
        size="small"
        color="secondary"
      >
        Cancel
      </Button>

      <Tooltip
        title={
          !canSubmit
            ? "Vendor, Pool, Trips Date and Request Date are required"
            : ""
        }
      >
        <span>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="small"
          >
            {loading.submit ? "Saving..." : "Create"}
          </Button>
        </span>
      </Tooltip>
    </DialogActions>
  );

  useCreateWashRequestAgent({
    open,
    setFormData: (val) => {
      if (typeof val === "function") {
        const next = val(getValues());
        Object.entries(next).forEach(([k, v]) => setValue(k, v));
      } else {
        Object.entries(val).forEach(([k, v]) => setValue(k, v));
      }
    },
    setInfo,
    setError,
    setRewashRows,
    setWashRows,
    buildRewashRowsFromProducts,
    vendors,
    pools,
    wrDateTouched,
    setWrDateTouched,
    normalizeQtyInput,
    _updateRewashRow,
    resetAll,
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      {Header}
      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={1} sx={{ mb: 1 }}>
          {!!error && <Alert severity="error">{error}</Alert>}
          {!!info && <Alert severity="info">{info}</Alert>}
        </Stack>

        {/* Two-pane layout */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
            gap: 2,
            alignItems: "start",
          }}
        >
          {LeftPanel}

          {/* Animated right side: cross-fade bodies */}
          <Box sx={{ position: "relative", minHeight: 320 }}>
            <Fade in={mode === "wash"} timeout={200} unmountOnExit mountOnEnter>
              <Box sx={{ position: "absolute", inset: 0 }}>
                {RightPanelWash}
              </Box>
            </Fade>

            <Fade
              in={mode === "rewash"}
              timeout={200}
              unmountOnExit
              mountOnEnter
            >
              <Box sx={{ position: "absolute", inset: 0 }}>
                {RightPanelRewash}
              </Box>
            </Fade>
          </Box>
        </Box>
      </DialogContent>

      {SummaryBar}
    </Dialog>
  );
}
