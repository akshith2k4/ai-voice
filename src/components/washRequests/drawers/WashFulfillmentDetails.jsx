import React from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
} from "@mui/material";
import { format, parseISO } from "date-fns";
import CloseIcon from "@mui/icons-material/Close";
import { soiledService } from "../../../services/soiledService";
import EditProductQuantitiesDialog from "./EditProductQuantitiesDialog";
import { DATE_TIME, formatCustomDate } from "../../../utils/dateUtils";
import TableCell from "../../common/TableCell";

const PRODUCT_DISPLAY_PRIORITY = [
  "SINGLE BED SHEET",
  "DOUBLE BED SHEET",
  "SINGLE DUVET COVER",
  "DOUBLE DUVET COVER",
  "PILLOW COVER",
  "BATH TOWEL",
  "HAND TOWEL",
  "BATH MAT",
  "QUEEN DUVET COVER",
  "BLUE BATH TOWEL",
  "BLUE HAND TOWEL",
];

const PRODUCT_DISPLAY_PRIORITY_MAP = new Map(
  PRODUCT_DISPLAY_PRIORITY.map((name, index) => [name, index])
);

function WashFulfillmentDetails({ fulfillment, onClose }) {
  // const parseDate = (s) => {
  //   if (!s) return "";
  //   try {
  //     const d = new Date(s);
  //     return isNaN(d.getTime()) ? "" : format(d, "dd/MM/yyyy HH:mm");
  //   } catch {
  //     return "";
  //   }
  // };

  const statusColor = (s) =>
    s === "COMPLETED" || s === "FULFILLED" ? "success" : s === "PENDING" ? "warning" : "default";

  // Normalizers
  const qtyWashed = (pi) => Number(pi?.washedQuantity) || 0;
  const qtyDamaged = (pi) => Number(pi?.damagedQuantity) || 0;
  const qtySoiled = (pi) => Number(pi?.soiledQuantity) || 0;

  const rawMappings = Array.isArray(fulfillment?.mappings) ? fulfillment.mappings : [];

  // Date bucket helpers
  const toLocalDateKey = (val) => {
    if (!val) return null;
    try {
      const d = val instanceof Date ? val : parseISO(String(val));
      if (isNaN(d.getTime())) return null;
      return format(d, "yyyy-MM-dd");
    } catch {
      const d2 = new Date(val);
      return isNaN(d2.getTime()) ? null : format(d2, "yyyy-MM-dd");
    }
  };
  const parseDateKeyToDate = (dk) => {
    if (!dk || typeof dk !== "string") return null;
    const m = dk.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };

  const dateKeys = Array.from(
    new Set(
      rawMappings
        .map((m) => toLocalDateKey(m?.washRequestedDate))
        .filter((x) => typeof x === "string" && x.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Aggregate product data with per-date washed buckets
  const productMap = new Map();
  rawMappings.forEach((m) => {
    const dk = toLocalDateKey(m?.washRequestedDate);
    (m.productItems || []).forEach((pi) => {
      const name = pi.productName || String(pi.productId ?? "UNKNOWN");
      const washed = qtyWashed(pi);
      const damaged = qtyDamaged(pi);
      const soiled = qtySoiled(pi);
      const prev = productMap.get(name) || {
        productId: pi.productId ?? null,
        productName: name,
        washed: 0,
        damaged: 0,
        soiled: 0,
        perDate: {},
        fulfillmentItemRefs: [],
      };

      const fulfillmentItemRefs = (Array.isArray(pi?.fulfillmentItems) ? pi.fulfillmentItems : [])
        .map((item) =>  item?.inventoryItemId ?? item?.id)
        .filter((value) => value !== null && value !== undefined);

      prev.washed += washed;
      prev.damaged += damaged;
      prev.soiled += soiled;
      prev.fulfillmentItemRefs.push(...fulfillmentItemRefs);
      if (dk) prev.perDate[dk] = (prev.perDate[dk] || 0) + washed;
      productMap.set(name, prev);
    });
  });
  const productRows = Array.from(productMap.values()).sort((a, b) => {
    const aName = String(a?.productName || "").trim().toUpperCase();
    const bName = String(b?.productName || "").trim().toUpperCase();

    const aPriority = PRODUCT_DISPLAY_PRIORITY_MAP.get(aName);
    const bPriority = PRODUCT_DISPLAY_PRIORITY_MAP.get(bName);

    if (aPriority !== undefined && bPriority !== undefined) {
      return aPriority - bPriority;
    }
    if (aPriority !== undefined) return -1;
    if (bPriority !== undefined) return 1;

    return aName.localeCompare(bName);
  });

  const getFulfillmentItemsTooltipTitle = (row) => {
    const refs = Array.from(new Set(Array.isArray(row?.fulfillmentItemRefs) ? row.fulfillmentItemRefs : []));
    return refs.length > 0 ? refs.join(", ") : "No fulfillment items";
  };
  // ---------- Local overrides for damaged/soiled (UI-only) ----------
  const [quantityEdits, setQuantityEdits] = React.useState({}); // key -> { damaged, soiled }
  const getKey = (r) => r.productId ?? r.productName;
  const displayDamaged = (r) => {
    const k = getKey(r);
    const v = quantityEdits?.[k]?.damaged;
    return typeof v === "number" ? v : (r.damaged || 0);
  };
  const displaySoiled = (r) => {
    const k = getKey(r);
    const v = quantityEdits?.[k]?.soiled;
    return typeof v === "number" ? v : (r.soiled || 0);
  };
  // Seed edits when fulfillment changes
  React.useEffect(() => {
    const init = {};
    productRows.forEach((r) => {
      const k = getKey(r);
      init[k] = { damaged: r.damaged || 0, soiled: r.soiled || 0 };
    });
    setQuantityEdits(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillment?.id]);

  const totalWashed = productRows.reduce((s, r) => s + (r.washed || 0), 0);
  const totalDamaged = productRows.reduce((s, r) => s + displayDamaged(r), 0);
  const totalSoiled = productRows.reduce((s, r) => s + displaySoiled(r), 0);
  const totalsPerDate = dateKeys.map((dk) => productRows.reduce((sum, r) => sum + (r.perDate?.[dk] || 0), 0));

  // Toggle for showing per-date washed columns
  const [showDateCols, setShowDateCols] = React.useState(false);
  const canToggleDates = dateKeys.length > 0;
  const handleToggleDates = () => {
    if (!canToggleDates) return;
    setShowDateCols((v) => !v);
  };

  // ---------- Dialog state for per-product edits ----------
  const [editOpen, setEditOpen] = React.useState(false);
  const [editProduct, setEditProduct] = React.useState(null); // row object
  const [editDamaged, setEditDamaged] = React.useState(0);
  const [editSoiled, setEditSoiled] = React.useState(0);
  // saving handled inside dialog component now

  const openEdit = (row) => {
    const washed = row?.washed || 0;
    const d = displayDamaged(row);
    const s = displaySoiled(row);
    setEditProduct(row);
    setEditDamaged(Math.min(Math.max(0, d), washed));
    setEditSoiled(Math.min(Math.max(0, s), washed));
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditOpen(false);
    setEditProduct(null);
  };
  const handleSaveEdit = () => {
    if (!editProduct) return;
    const washed = editProduct?.washed || 0;
    const d = Math.min(Number.isFinite(editDamaged) ? editDamaged : 0, washed);
    const s = Math.min(Number.isFinite(editSoiled) ? editSoiled : 0, washed);
    const k = getKey(editProduct);
    const productId = editProduct?.productId;
    if (!productId) {
      window.alert("This product cannot be updated because productId is missing.");
      return;
    }
    const updates = [{ productId, damagedQuantity: Math.max(0, d), soiledQuantity: Math.max(0, s) }];
    return soiledService
      .updateFulfillmentQuantities(fulfillment?.id, updates)
      .then(() => {
        setQuantityEdits((prev) => ({ ...prev, [k]: { damaged: Math.max(0, d), soiled: Math.max(0, s) } }));
        closeEdit();
      })
      .catch((err) => {
        console.error(err);
        window.alert(err?.response?.data?.message || "Failed to update quantities.");
        throw err;
      });
  };

  if (!fulfillment) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2">No fulfillment selected.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
      <Box
        sx={{
          p: 2,
          px: 3,
          borderBottom: 1,
          borderColor: "#e0e0e0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#1a1a1a" }}>
          Fulfillment Details
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: "#757575", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: "auto", px: 3, py: 2 }}>
        <List disablePadding>
          <ListItem>
            <ListItemText
              primary={
                <Typography variant="subtitle1" sx={{ color: "#2e7d32", fontWeight: 500, mb: 1 }}>
                  Summary
                </Typography>
              }
              secondary={
                <>
                  <Typography variant="body2"><strong>ID:</strong> {fulfillment.id}</Typography>
                  <Typography variant="body2"><strong>Request #:</strong> {fulfillment.requestNumber || "—"}</Typography>
                  <Typography variant="body2"><strong>Vendor:</strong> {fulfillment.vendorName || "N/A"}</Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong>
                    <Chip label={fulfillment.status} size="small" color={statusColor(fulfillment.status)} sx={{ ml: 1 }} />
                  </Typography>
                  <Typography variant="body2">
                    <strong>Planned Fulfillment Time:</strong> {formatCustomDate(fulfillment.plannedFulfillmentTime, DATE_TIME)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Actual Fulfillment Time:</strong> <strong>{formatCustomDate(fulfillment.actualFulfillmentTime, DATE_TIME)}</strong>
                  </Typography>
                  <Typography variant="body2"><strong>Notes:</strong> {fulfillment.notes || "—"}</Typography>
                </>
              }
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ color: "#2e7d32", fontWeight: 500 }}>
                    Product Summary
                  </Typography>
                </Box>
              }
              secondary={
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '25%' }}>Product</TableCell>
                        {showDateCols &&
                          dateKeys.map((dk) => (
                            <TableCell key={dk} align="center" sx={{whiteSpace:"nowrap"}}>
                              {(() => {
                                const d = parseDateKeyToDate(dk);
                                return d ? format(d, "MMM d") : dk;
                              })()}
                            </TableCell>
                          ))}
                        <TableCell
                          align="center"
                          onClick={handleToggleDates}
                          sx={{ cursor: canToggleDates ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap", width: '25%' }}
                          title={canToggleDates ? (showDateCols ? "Hide date breakdown" : "Show date breakdown") : undefined}
                        >
                          Washed Qty{canToggleDates ? (showDateCols ? " ▲" : " ▼") : ""}
                        </TableCell>
                        <TableCell align="center" sx={{ width: '25%' }}>Damaged Qty</TableCell>
                        <TableCell align="center" sx={{ width: '25%' }}>Soiled Qty</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productRows.length > 0 ? (
                        <>
                          {productRows.map((r, idx) => (
                            <TableRow key={`${r.productId ?? r.productName}-${idx}`}>
                              <TableCell>
                                <Button
                                  size="small"
                                  onClick={() => openEdit(r)}
                                  sx={{ p: 0, minWidth: 0, textDecoration: "underline dotted" }}
                                >
                                  {r.productName}
                                </Button>
                              </TableCell>
                              {showDateCols &&
                                dateKeys.map((dk) => (
                                  <TableCell key={`${dk}-${idx}`} align="center">
                                    {r.perDate?.[dk] ?? 0}
                                  </TableCell>
                                ))}
                              <TableCell
                                variant="scan"
                                value={r.washed ?? 0}
                                editable={false}
                                inventoryItemIds={Array.from(new Set(r.fulfillmentItemRefs || []))}
                              />
                              <TableCell align="center">{displayDamaged(r)}</TableCell>
                              <TableCell align="center">{displaySoiled(r)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                            {showDateCols &&
                              dateKeys.map((dk, i) => (
                                <TableCell key={`total-${dk}`} align="center" sx={{ fontWeight: 600 }}>
                                  {totalsPerDate[i] ?? 0}
                                </TableCell>
                              ))}
                            <TableCell align="center" sx={{ fontWeight: 600 }}>{totalWashed}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>{totalDamaged}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>{totalSoiled}</TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4 + (showDateCols ? dateKeys.length : 0)} align="center">No product items linked.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              }
            />
          </ListItem>
        </List>
      </Box>
      {/* Edit Dialog */}
      <EditProductQuantitiesDialog
        open={editOpen}
        onClose={closeEdit}
        productName={editProduct?.productName}
        washed={editProduct?.washed ?? 0}
        initialDamaged={editDamaged}
        initialSoiled={editSoiled}
        onSubmit={({ damaged, soiled }) => {
          // Keep local state in sync so reopening shows recent values
          setEditDamaged(damaged);
          setEditSoiled(soiled);
          // Delegate saving to existing handler which updates backend and parent state
          return handleSaveEdit();
        }}
      />
    </Box>
  );
}

export default WashFulfillmentDetails;
