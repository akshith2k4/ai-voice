import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  MenuItem,
  Typography,
  CircularProgress,
  Stack,
  Divider,
  Chip,
  Tooltip,
  Skeleton,
  InputAdornment,
} from "@mui/material";
// import SearchIcon from "@mui/icons-material/Search";
import { washFulfillmentService } from "../../../services/washFulfillmentService";
import { laundryVendorService } from "../../../services/laundryVendorService";
import { inventoryService } from "../../../services/inventoryService";
import { useDcid } from "../../../context/DcidContext";
import ColumnScanHeaderAction from "../../Scanner/ColumnScanHeaderAction";
import ScannerHeader from "../../Scanner/ScannerHeader";
import QuantityScanInput from "../../Scanner/QuantityScanInput";
import { scannerController } from "../../Scanner/ScannerController";
import KnockOffResultDialog from "./KnockOffResultDialog";
import { useCreateWashFulfillmentAgent } from "../../../useagent/useCreateWashFulfillmentAgent";

// Valid item condition types for fulfillment
const ITEM_CONDITION_TYPES = [
  "FRESH",
  "SOILED",
  "DAMAGED",
  "HEAVY_SOILED",
  "DIRTY",
  "MISSING",
  "OTHER",
];

/** ---------- Component ---------- */
function FulfillmentDialog({ open, onClose, onSuccess }) {
  const { dcid } = useDcid();
  const [warehouses, setWarehouses] = useState([]);

  const { control, setValue, getValues, watch, reset } = useForm({
    defaultValues: {
      vendorId: "",
      fulfilledDateTime: "",
      washType: "WASH",
      poolId: "",
      requestNumber: "",
      notes: "",
    }
  });

  const formData = watch();
  const { vendorId, fulfilledDateTime, washType, poolId, requestNumber, notes } = formData;

  const setVendorId = useCallback((val) => setValue("vendorId", val), [setValue]);
  const setFulfilledDateTime = useCallback((val) => setValue("fulfilledDateTime", val), [setValue]);
  const setWashType = useCallback((val) => setValue("washType", val), [setValue]);
  const setPoolId = useCallback((val) => setValue("poolId", val), [setValue]);
  const setRequestNumber = useCallback((val) => setValue("requestNumber", val), [setValue]);
  const setNotes = useCallback((val) => setValue("notes", val), [setValue]);

  const [vendors, setVendors] = useState([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [pools, setPools] = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [knockOffDialogData, setKnockOffDialogData] = useState(null);

  //scannerHeader
  const [showScannerHeader, setShowScannerHeader] = useState(false);
  const [scanStatus, setScanStatus] = useState("IDLE");
  const [scannedCount, setScannedCount] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [scanPreview, setScanPreview] = useState([]);
  const [scannedInventoryIds, setScannedInventoryIds] = useState(new Set()); // Track unique scans with Set

  // Queue for pending scan messages that arrive before activeScan is set
  const pendingScansRef = useRef([]);

  // Track if we've already auto-activated to WASHED on first connection
  const hasAutoActivatedRef = useRef(false);

  // Prefix for Request Number e.g., "WFR-2025-" and allow only 4 digits after
  const requestNumberPrefix = useMemo(() => {
    const year = new Date().getFullYear();
    return `WFR-${year}-`;
  }, []);

  /**
   * sections = [
   *   { referenceId, referenceName, rows: [...], expanded }
   * ]
   */
  const [sections, setSections] = useState([]);

  // Removed accordion + multi-pool UX in favor of single Pool selection

  /** Refs to inputs for keyboard navigation */
  const inputRefs = useRef({}); // key: `${referenceId}-${productId}` -> ref

  const resetFulfillmentDialogState = useCallback(() => {
    reset({
      vendorId: "",
      fulfilledDateTime: "",
      washType: "WASH",
      poolId: "",
      requestNumber: requestNumberPrefix,
      notes: "",
    });
    setSections([]);
    setLoadingRows(false);
    setLoadingSubmit(false);
    setLoadingReview(false);
    setKnockOffDialogData(null);
    inputRefs.current = {};

    setScannedInventoryIds(new Set());
    setShowScannerHeader(false);
    setScanStatus("IDLE");
    setScannedCount(0);
    setActiveSessionId(null);
    setScanPreview([]);
    setActiveScan(null);

    pendingScansRef.current = [];
    hasAutoActivatedRef.current = false;
  }, [requestNumberPrefix, reset]);

  const handleDialogClose = useCallback(async (...args) => {
    try {
      await scannerController.cancel();
    } catch (e) {
      console.error("Failed to cancel scanner session on dialog close", e);
    } finally {
      resetFulfillmentDialogState();
      onClose?.(...args);
    }
  }, [onClose, resetFulfillmentDialogState]);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    resetFulfillmentDialogState();
  }, [open, resetFulfillmentDialogState]);

  useEffect(() => {
    if (scanStatus === "ACTIVE") {
      setShowScannerHeader(true);
    }
  }, [scanStatus]);

  useEffect(() => {
    if (!open) {
      (async () => {
        try {
          if (scannerController.hasActiveSession()) {
            await scannerController.stop();
          }
        } catch (e) {
          console.error("Failed to cleanup scan session on dialog close", e);
        }
      })();
    }
  }, [open]);

  // Load vendors
  useEffect(() => {
    if (!open) return;
    (async () => {
      setVendorLoading(true);
      try {
        const data = await laundryVendorService.getAllVendors();
        setVendors(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load laundry vendors", e);
        setVendors([]);
      } finally {
        setVendorLoading(false);
      }
    })();
  }, [open]);

  // Cleanup scanner state when dialog closes
  useEffect(() => {
    return () => {
      if (!open) {
        setActiveScan(null);
        setActiveSessionId(null);
        setScanStatus("IDLE");
        pendingScansRef.current = [];
        hasAutoActivatedRef.current = false; // Reset auto-activation flag for next session
      }
    };
  }, [open]);

  // Handle RFID scan messages - simplified like WRUnifiedDialog
  const handleScanMessage = useCallback((msg) => {
    console.log('handleScanMessage called with:', msg);
    console.log('  Current state: activeScan =', activeScan?.quantityType, 'activeSessionId =', activeSessionId);

    if (!msg) {
      console.log('Early return: no msg');
      return;
    }

    // Track the session ID - either from existing state or extract from message
    let effectiveSessionId = activeSessionId;

    // ALWAYS extract sessionId from the first valid message (before any other checks)
    // This ensures activeSessionId is set even if activeScan was set by auto-activation
    if (msg.sessionId && !activeSessionId) {
      console.log('🔑 Setting activeSessionId from scan message:', msg.sessionId);
      effectiveSessionId = msg.sessionId; // Use it immediately (before state update)
      setActiveSessionId(msg.sessionId); // Schedule state update
    }

    // If we got a scan message but no activeScan yet, queue the message
    if (!activeScan) {
      console.log('handleScanMessage: activeScan not set yet, queuing message');

      // Queue this message to be processed once activeScan is set
      console.log('🔄 Queuing pending scan message');
      pendingScansRef.current.push(msg);

      return;
    }
    console.log('  SessionId check: msg.sessionId =', msg.sessionId, 'effectiveSessionId =', effectiveSessionId);

    // Reject only if we have an established session and this message is from a different session
    if (effectiveSessionId && msg.sessionId && msg.sessionId !== effectiveSessionId) {
      console.log('⛔ Early return: sessionId mismatch', { msgSessionId: msg.sessionId, effectiveSessionId });
      return;
    }

    console.log('✅ Message passing all checks, proceeding to process scan data');
    // Parse WebSocket data: handle both array of items and single item formats
    const scannedItems = Array.isArray(msg.results?.items)
      ? msg.results.items
      : Array.isArray(msg.scannedTags)
        ? msg.scannedTags
        : msg.inventoryItemId
          ? [msg]
          : [];

    const validItems = scannedItems.filter(
      (item) => item.inventoryItemId || item.rfidTag,
    );

    console.log('Scanned items parsed:', {
      rawScannedItems: scannedItems,
      validItems,
      validItemsCount: validItems.length,
    });

    if (!validItems.length) {
      console.log('No valid items found');
      return;
    }

    // Determine condition type based on active scan column
    let conditionTypeDefault = "FRESH";
    if (activeScan.quantityType === "WASHED") {
      conditionTypeDefault = "FRESH";
    } else if (activeScan.quantityType === "DAMAGED") {
      conditionTypeDefault = "DAMAGED";
    } else if (activeScan.quantityType === "SOILED") {
      conditionTypeDefault = "SOILED";
    }

    console.log('FulfillmentDialog: Scan message', {
      itemCount: validItems.length,
      activeScan,
      conditionTypeDefault,
      currentSections: sections.map(s => ({
        referenceId: s.referenceId,
        rowCount: s.rows.length,
        productIds: s.rows.map(r => r.productId),
      })),
    });

    // Update sections with scanned data
    setSections((prevSections) => {
      console.log('setSections callback - prevSections:', {
        sectionCount: prevSections.length,
        details: prevSections.map(s => ({
          referenceId: s.referenceId,
          rowCount: s.rows.length,
          productIds: s.rows.map(r => r.productId),
        })),
      });

      const newSet = new Set(scannedInventoryIds);
      let newScansCount = 0;

      const updatedSections = prevSections.map((sec) => {
        // Only update the section that matches activeScan
        if (String(sec.referenceId) !== String(activeScan.referenceId)) {
          console.log('Section skipped - referenceId mismatch', {
            secId: sec.referenceId,
            activeScanId: activeScan.referenceId,
          });
          return sec;
        }

        console.log('Processing section:', sec.referenceId);

        return {
          ...sec,
          rows: sec.rows.map((row) => {
            console.log('Processing row:', {
              productId: row.productId,
              productName: row.productName,
              activeScanProductId: activeScan.productId,
            });

            // Check if this row matches the scan target
            if (
              activeScan.productId &&
              String(activeScan.productId) !== String(row.productId)
            ) {
              console.log('Row skipped - productId mismatch');
              return row;
            }

            let increment = 0;
            const newFulfillmentItems = [...(row.fulfillmentItems || [])];

            console.log('Processing items for product:', row.productId);
            console.log('validItems to check:', validItems.map(vi => ({
              invId: vi.inventoryItemId || vi.rfidTag,
              productId: vi.productId,
              conditionType: vi.itemConditionType,
            })));

            // Process each scanned item
            validItems.forEach((item) => {
              console.log('Checking item:', {
                invId: item.inventoryItemId || item.rfidTag,
                itemProductId: item.productId,
                rowProductId: row.productId,
                match: item.productId === row.productId,
              });

              // Match by productId
              if (String(item.productId) === String(row.productId) && (item.inventoryItemId || item.rfidTag)) {
                const invId = item.inventoryItemId || item.rfidTag;

                // Determine condition type strictly from the active scan column
                const validatedConditionType = conditionTypeDefault;

                // Create unique composite key
                const uniqueKey = `${invId}:${validatedConditionType}`;

                // Check if already scanned
                const alreadyExists = newFulfillmentItems.some(
                  (fi) => fi.soiledItemId === invId && fi.itemConditionType === validatedConditionType
                );

                console.log('Item match found:', {
                  invId,
                  validatedConditionType,
                  uniqueKey,
                  alreadyExists,
                  setHas: newSet.has(uniqueKey),
                });

                if (!alreadyExists && !newSet.has(uniqueKey)) {
                  newSet.add(uniqueKey);
                  increment++;
                  newScansCount++;

                  console.log('Item added to fulfillmentItems');

                  // Add to fulfillmentItems
                  newFulfillmentItems.push({
                    soiledItemId: invId,
                    itemConditionType: validatedConditionType,
                    notes: item.notes || item.note || "",
                  });
                }
              }
            });

            console.log('Row processing result:', {
              productId: row.productId,
              increment,
              newFulfillmentItemsCount: newFulfillmentItems.length,
            });

            if (increment === 0) return row;

            // Update quantity based on scan type
            let updatedRow = {
              ...row,
              fulfillmentItems: newFulfillmentItems,
            };

            if (activeScan.quantityType === "WASHED") {
              updatedRow.washedQuantity = (Number(row.washedQuantity) || 0) + increment;
            } else if (activeScan.quantityType === "DAMAGED") {
              updatedRow.damagedQuantity = (Number(row.damagedQuantity) || 0) + increment;
            } else if (activeScan.quantityType === "SOILED") {
              updatedRow.soiledQuantity = (Number(row.soiledQuantity) || 0) + increment;
            }

            console.log('FulfillmentDialog: Row updated', {
              productId: row.productId,
              quantityType: activeScan.quantityType,
              increment,
              newQuantity: updatedRow[
                activeScan.quantityType === "WASHED" ? "washedQuantity" :
                  activeScan.quantityType === "DAMAGED" ? "damagedQuantity" :
                    "soiledQuantity"
              ],
              fulfillmentItemsCount: newFulfillmentItems.length,
            });

            // Update UI scan preview only for items that were actually added
            const itemsToPreview = validItems.filter(
              (item) => {
                if (String(item.productId) !== String(row.productId)) return false;
                const invId = item.inventoryItemId || item.rfidTag;
                // Determine condition type strictly from the active scan column
                const validatedConditionType = conditionTypeDefault;
                return newSet.has(`${invId}:${validatedConditionType}`);
              }
            );

            setScanPreview((prev) =>
              [
                ...itemsToPreview.map((item) => ({
                  id: item.inventoryItemId || item.rfidTag,
                  productName: item.productName || row.productName,
                  scanType: "WASH_FULFILLMENT_CREATION",
                  quantityType: activeScan.quantityType,
                })),
                ...prev,
              ].slice(0, 20)
            );

            return updatedRow;
          }),
        };
      });

      console.log('Updated sections to return:', updatedSections);

      // Update global scan state
      if (newScansCount > 0) {
        console.log('Updating scanned inventory IDs and count:', {
          newSetSize: newSet.size,
          newScansCount,
        });
        setScannedInventoryIds(newSet);
        setScannedCount(newSet.size);
      }

      return updatedSections;
    });
  }, [activeScan, activeSessionId, sections, scannedInventoryIds]);

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

  // Load pools for Pool selector
  useEffect(() => {
    if (!open) return;
    (async () => {
      setPoolLoading(true);
      try {
        const data = await inventoryService.getPools();
        setPools(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load pools", e);
        setPools([]);
      } finally {
        setPoolLoading(false);
      }
    })();
  }, [open]);

  // Build grouped sections when vendor and pool are selected
  useEffect(() => {
    if (!fulfilledDateTime || !vendorId || !poolId) {
      setSections([]);
      return;
    }

    setLoadingRows(true);
    try {
      const selectedPool = pools.find((p) => String(p.id) === String(poolId));
      if (!selectedPool) {
        setSections([]);
        return;
      }

      const productMap = {};
      (selectedPool.productItems || []).forEach((prod) => {
        if (!productMap[prod.productId]) {
          productMap[prod.productId] = {
            productId: prod.productId,
            productName: prod.productName,
            total: 1000, // No cap
            washedQuantity: 0,
            damagedQuantity: 0,
            soiledQuantity: 0,
            fulfillmentItems: [],
            selected: true,
          };
        }
      });
      const rows = Object.values(productMap);

      // In the new UX, we just show a single section for the pool
      setSections([
        {
          referenceId: selectedPool.id,
          referenceName: selectedPool.name || `Pool ${selectedPool.id}`,
          rows,
        },
      ]);
    } catch (err) {
      console.error("Error setting products from pool", err);
      setSections([]);
    } finally {
      setLoadingRows(false);
    }
  }, [fulfilledDateTime, vendorId, poolId, pools]);



  // Rows that will be actually sent: only from selected pool if chosen, else none
  const selectedSection = useMemo(() => {
    const id = Number(poolId);
    return sections.find((s) => Number(s.referenceId) === id) || null;
  }, [sections, poolId]);

  // Auto-set activeScan to WASHED column when scanner session starts (only once per connection)
  useEffect(() => {
    console.log('Auto-set useEffect check:', {
      activeSessionId,
      activeScan,
      selectedSection: selectedSection ? { referenceId: selectedSection.referenceId, rowCount: selectedSection.rows.length } : null,
      hasAutoActivated: hasAutoActivatedRef.current,
      conditionsMet: {
        hasActiveSessionId: !!activeSessionId,
        noActiveScan: !activeScan,
        hasSelectedSection: !!selectedSection,
        notAlreadyActivated: !hasAutoActivatedRef.current,
      },
    });

    // Reset flag if activeSessionId became null (disconnected)
    if (!activeSessionId) {
      hasAutoActivatedRef.current = false;
    }

    // Only auto-activate on FIRST scanner connection, not on subsequent reconnects
    if (activeSessionId && !activeScan && selectedSection && !hasAutoActivatedRef.current) {
      console.log('✅ Auto-setting activeScan to WASHED for section:', selectedSection.referenceId);
      hasAutoActivatedRef.current = true; // Mark that we've auto-activated
      setActiveScan({
        quantityType: "WASHED",
        referenceId: selectedSection.referenceId,
      });
      setScanStatus("ACTIVE");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, selectedSection]);

  // Process pending scan messages once activeScan is set
  useEffect(() => {
    const hasPending = pendingScansRef.current.length > 0;
    const hasActiveScan = !!activeScan;
    console.log('🔍 Pending-message useEffect fired:', {
      hasActiveScan,
      hasPending,
      pendingCount: pendingScansRef.current.length,
      activeScanQtyType: activeScan?.quantityType,
    });

    if (activeScan && hasPending) {
      console.log('🎯 Processing pending scan messages:', pendingScansRef.current.length);
      const pendingMessages = [...pendingScansRef.current];
      pendingScansRef.current = []; // Clear the queue

      // Process each queued message
      pendingMessages.forEach((msg) => {
        console.log('⏸️ Replaying queued message with activeScan:', activeScan?.quantityType);
        handleScanMessage(msg);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScan]);

  const effectiveRows = useMemo(() => {
    if (!selectedSection) return [];
    return selectedSection.rows.map((r) => ({
      ...r,
      _referenceId: selectedSection.referenceId,
    }));
  }, [selectedSection]);

  const summary = useMemo(() => {
    const rowsForSummary = effectiveRows;
    const totalRows = rowsForSummary.length;
    const totalWashed = rowsForSummary.reduce(
      (acc, r) => acc + (r.washedQuantity || 0),
      0,
    );
    const totalDamaged = rowsForSummary.reduce(
      (acc, r) => acc + (r.damagedQuantity || 0),
      0,
    );
    const totalSoiled = rowsForSummary.reduce(
      (acc, r) => acc + (r.soiledQuantity || 0),
      0,
    );
    const rangeLabel = "";
    const vendorName =
      vendors.find((v) => String(v.id) === vendorId)?.name || "";
    const poolName =
      pools.find((p) => String(p.id) === String(poolId))?.name || "";
    return {
      totalRows,
      totalWashed,
      totalDamaged,
      totalSoiled,
      rangeLabel,
      vendorName,
      poolName,
    };
  }, [effectiveRows, vendors, vendorId, pools, poolId]);

  /** ---------- UI actions ---------- */
  const updateWashedQty = (referenceId, productId, value) => {
    const raw = Number(value);
    let qty = Number.isFinite(raw) ? Math.max(0, raw) : 0; // allow any non-negative
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.referenceId !== referenceId) return sec;
        return {
          ...sec,
          rows: sec.rows.map((r) => {
            if (r.productId !== productId) return r;
            return {
              ...r,
              washedQuantity: qty,
            };
          }),
        };
      }),
    );
  };

  const updateDamagedQty = (referenceId, productId, value) => {
    const raw = Number(value);
    let qty = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.referenceId !== referenceId) return sec;
        return {
          ...sec,
          rows: sec.rows.map((r) => {
            if (r.productId !== productId) return r;
            return { ...r, damagedQuantity: qty };
          }),
        };
      }),
    );
  };

  const updateSoiledQty = (referenceId, productId, value) => {
    const raw = Number(value);
    let qty = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.referenceId !== referenceId) return sec;
        return {
          ...sec,
          rows: sec.rows.map((r) => {
            if (r.productId !== productId) return r;
            return { ...r, soiledQuantity: qty };
          }),
        };
      }),
    );
  };

  // Accordion UI removed

  const buildKnockOffPayload = () => {
    const candidateRows = effectiveRows;
    // Use UTC date to stay consistent with the rest of the codebase
    const toDateOnly = (val) => {
      if (!val) return "";
      const dt = val instanceof Date ? val : new Date(val);
      if (isNaN(dt.getTime())) return "";
      return dt.toISOString().split("T")[0]; // UTC date: "YYYY-MM-DD"
    };

    const fulfillmentProducts = [];

    candidateRows.forEach(row => {
      const scannedItems = row.fulfillmentItems || [];
      const conditionMap = { FRESH: [], DAMAGED: [], SOILED: [], HEAVY_SOILED: [], DIRTY: [], MISSING: [], OTHER: [] };

      scannedItems.forEach(item => {
        if (item.soiledItemId && item.itemConditionType) {
          if (!conditionMap[item.itemConditionType]) {
            conditionMap[item.itemConditionType] = [];
          }
          conditionMap[item.itemConditionType].push(item.soiledItemId);
        }
      });

      const washedQty = Math.max(0, Number(row.washedQuantity) || 0);
      const damagedQty = Math.max(0, Number(row.damagedQuantity) || 0);
      const soiledQty = Math.max(0, Number(row.soiledQuantity) || 0);

      if (washedQty > 0 || damagedQty > 0 || soiledQty > 0) {
        fulfillmentProducts.push({
          productId: row.productId,
          productName: row.productName,
          freshReceived: washedQty,
          freshReceivedInventoryItemIds: conditionMap.FRESH || [],
          soiledReceived: soiledQty,
          soiledReceivedInventoryItemIds: conditionMap.SOILED || [],
          damagedReceived: damagedQty,
          damagedReceivedInventoryItemIds: conditionMap.DAMAGED || [],
        });
      }
    });

    if (fulfillmentProducts.length === 0) return null;

    return {
      inventoryPoolId: Number(poolId),
      washFulfillmentDate: toDateOnly(fulfilledDateTime || new Date()),
      washType: washType,
      fulfillmentProducts,
      dcId: Number(dcid),
      laundryVendorId: Number(vendorId),
    };
  };

  const handleReviewWashes = async () => {
    if (!poolId || !vendorId) {
      alert("Pool and Vendor are required to review washes.");
      return;
    }
    const payload = buildKnockOffPayload();
    if (!payload) {
      alert("No quantities entered to review.");
      return;
    }

    setLoadingReview(true);
    try {
      const response = await washFulfillmentService.createKnockOff(payload);
      setKnockOffDialogData(response);
    } catch (err) {
      console.error("Error creating knock-off review", err);
      alert("Failed to review washes.");
    } finally {
      setLoadingReview(false);
    }
  };

  const handleSubmit = async () => {
    if (!requestNumber.trim()) {
      alert("Request Number is required");
      return;
    }
    if (!vendorId) {
      alert("Vendor is required");
      return;
    }
    if (!poolId) {
      alert("Pool is required");
      return;
    }
    if (dcid == null) {
      alert("Please select a DC/Warehouse before submitting the fulfillment.");
      return;
    }

    // 1. Re-validate
    const candidateRows = effectiveRows;
    const toWash = candidateRows.filter((r) => (r.washedQuantity || r.damagedQuantity || r.soiledQuantity) > 0);
    if (toWash.length === 0) {
      alert("Enter quantity for at least one product");
      return;
    }

    setLoadingSubmit(true);

    try {
      // Use UTC ISO string to stay consistent with the rest of the codebase
      // datetime-local input gives a naive "YYYY-MM-DDTHH:mm" string in local time,
      // so we parse it as local and then convert to UTC via toISOString().
      const toUtcDateTime = (val) => {
        if (!val) return "";
        const dt = val instanceof Date ? val : new Date(val);
        if (isNaN(dt.getTime())) return "";
        return dt.toISOString(); // UTC ISO-8601: "YYYY-MM-DDTHH:mm:ss.sssZ"
      };

      // Build flat washedProducts list from UI rows
      const washedProducts = candidateRows
        .filter(row => (row.washedQuantity || 0) > 0 || (row.damagedQuantity || 0) > 0 || (row.soiledQuantity || 0) > 0)
        .map(row => {
          const fulfillmentItems = row.fulfillmentItems || [];

          return {
            productId: row.productId,
            productName: row.productName,
            freshReceived: Number(row.washedQuantity) || 0,
            freshReceivedInventoryItemIds: fulfillmentItems
              .filter(fi => fi.itemConditionType === "FRESH")
              .map(fi => Number(fi.soiledItemId)),
            soiledReceived: Number(row.soiledQuantity) || 0,
            soiledReceivedInventoryItemIds: fulfillmentItems
              .filter(fi => fi.itemConditionType === "SOILED")
              .map(fi => Number(fi.soiledItemId)),
            damagedReceived: Number(row.damagedQuantity) || 0,
            damagedReceivedInventoryItemIds: fulfillmentItems
              .filter(fi => fi.itemConditionType === "DAMAGED")
              .map(fi => Number(fi.soiledItemId)),
          };
        });

      const finalPayload = {
        requestNumber: requestNumber.trim(),
        fulfilledDateTime: toUtcDateTime(fulfilledDateTime || new Date()),
        notes: notes || "",
        washRequestType: washType,
        vendorId: Number(vendorId),
        dcId: Number(dcid),
        poolId: Number(poolId),
        deliveryChallanImages: [],
        washedProducts,
      };

      await washFulfillmentService.createV4(finalPayload);
      onSuccess?.();
      await handleDialogClose();
    } catch (err) {
      console.error("Error creating wash fulfillment (v3)", err);
      alert("Failed to create wash fulfillment.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const canSubmit =
    Boolean(requestNumber.trim()) &&
    summary.totalWashed > 0 &&
    !loadingSubmit &&
    Boolean(vendorId) &&
    Boolean(poolId);

  /** ---------- Helpers ---------- */
  // no filtering in the new UX; table displays the chosen pool



  useCreateWashFulfillmentAgent({
    open,
    setWashType,
    setPoolId,
    setVendorId,
    setFulfilledDateTime,
    setRequestNumber,
    setNotes,
    effectiveRows,
    updateWashedQty,
    updateDamagedQty,
    updateSoiledQty,
    pools,
    vendors,
    resetFulfillmentDialogState,
  });

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pb: 0.5 }}>Create Wash Fulfillment</DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
            gap: 2,
            alignItems: "start",
          }}
        >
          {/* Left Panel */}
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
              Fulfillment Details
            </Typography>

            <Stack spacing={2.25}>
              {/* Disabled Warehouse bound to dcid */}
              <TextField
                select
                fullWidth
                size="small"
                label="Warehouse"
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
                label="Request Type"
                name="washRequestType"
                id="washRequestType"
                value={washType}
                onChange={(e) => setWashType(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="WASH">Wash</MenuItem>
                <MenuItem value="RE_WASH">Re-Wash</MenuItem>
              </TextField>
              <TextField
                select
                label="Pool"
                name="pool"
                id="pool"
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                fullWidth
                size="small"
                disabled={poolLoading}
                required
              >
                {poolLoading && (
                  <MenuItem disabled>
                    <CircularProgress size={18} sx={{ mr: 1 }} /> Loading pools…
                  </MenuItem>
                )}
                {!poolLoading && (
                  <MenuItem value="" disabled>
                    Select pool
                  </MenuItem>
                )}
                {!poolLoading &&
                  pools.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                      {p.name || `Pool ${p.id}`}
                    </MenuItem>
                  ))}
              </TextField>

              <TextField
                select
                label="Vendor"
                name="vendor"
                id="vendor"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                fullWidth
                size="small"
                disabled={vendorLoading}
                required
              >
                {vendorLoading && (
                  <MenuItem disabled>
                    <CircularProgress size={18} sx={{ mr: 1 }} /> Loading
                    vendors…
                  </MenuItem>
                )}
                {!vendorLoading && (
                  <MenuItem value="" disabled>
                    Select vendor
                  </MenuItem>
                )}
                {!vendorLoading &&
                  vendors.map((v) => (
                    <MenuItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </MenuItem>
                  ))}
              </TextField>

              <TextField
                label="Fulfillment Date & Time"
                name="fulfilledDateTime"
                id="fulfilledDateTime"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={fulfilledDateTime}
                onChange={(e) => setFulfilledDateTime(e.target.value)}
                fullWidth
                size="small"
                required
              />

              <TextField
                label="Request Number"
                name="requestNumber"
                id="requestNumber"
                value={requestNumber}
                onChange={(e) => setRequestNumber(e.target.value)}
                required
                fullWidth
                size="small"
                placeholder={`e.g., ${requestNumberPrefix}0001`}
              />

              <TextField
                label="Notes"
                name="notes"
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                size="small"
                placeholder="Optional instructions"
              />
            </Stack>
          </Box>

          {/* Right Panel: Pool products */}
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2,
              bgcolor: "background.paper",
              minHeight: 360,
              maxHeight: 560,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {showScannerHeader && (
              <Box sx={{ mb: 2 }}>
                <ScannerHeader
                  status={scanStatus}
                  scannedCount={scannedCount}
                  scanPreview={scanPreview}
                  onStop={async () => {
                    try {
                      await scannerController.stop();
                    } catch (e) {
                      console.error("Stop scan failed", e);
                    } finally {
                      setScannedInventoryIds(new Set());
                      setScanStatus("IDLE");
                      setScannedCount(0);
                      setActiveSessionId(null);
                      setScanPreview([]);
                      setActiveScan(null);
                      setShowScannerHeader(false);
                    }
                  }}
                  onCancel={async () => {
                    try {
                      await scannerController.cancel();
                    } catch (e) {
                      console.error("Cancel scan failed", e);
                    } finally {
                      resetFulfillmentDialogState();
                    }
                  }}
                />

              </Box>
            )}
            {/* Top toolbar / global summary */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                mb: 1,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, mr: "auto" }}
              >
                {summary.rangeLabel ? `${summary.rangeLabel} · ` : ""}Products:{" "}
                {summary.totalRows}
              </Typography>

              {/* <TextField
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                placeholder="Search product"
                size="small"
                sx={{ width: { xs: "100%", sm: 260 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              /> */}


              <Chip
                color="primary"
                variant="outlined"
                label={`Total Received: ${summary.totalWashed}`}
                size="small"
              />
              <Chip
                color="secondary"
                variant="outlined"
                label={`Damaged: ${summary.totalDamaged}`}
                size="small"
              />
              <Chip
                color="secondary"
                variant="outlined"
                label={`Soiled: ${summary.totalSoiled}`}
                size="small"
              />
            </Box>

            <Divider sx={{ mb: 1 }} />

            {loadingRows ? (
              <Box sx={{ p: 1, display: "grid", gap: 1.5 }}>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={44} />
                ))}
              </Box>
            ) : !fulfilledDateTime || !vendorId ? (
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
                  Select fulfilled date and vendor.
                </Typography>
              </Box>
            ) : !poolId ? (
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
                  Select a pool to view products.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflow: "auto" }}>
                {selectedSection ? (
                  (() => {
                    const sec = selectedSection;

                    return (
                      <Box
                        sx={{
                          overflow: "auto",
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          boxShadow: 1,
                          bgcolor: "background.paper",
                        }}
                      >
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr 140px 140px 140px",
                              sm: "1fr 160px 160px 160px",
                            },
                            gap: 2,
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                            bgcolor: "background.default",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            py: 1,
                            px: 2,
                            boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.06)",
                            borderTopLeftRadius: 8,
                            borderTopRightRadius: 8,
                            backdropFilter: "blur(2px)",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{ pl: 0.5 }}
                          >
                            Product
                          </Typography>
                          <ColumnScanHeaderAction
                            label="Washed"
                            quantityType="WASHED"
                            referenceId={sec.referenceId}
                            scanType="WASH_FULFILLMENT_CREATION"
                            onScanMessage={handleScanMessage}
                            inventoryItemIds={sec.rows.flatMap(r =>
                              (r.fulfillmentItems || [])
                                .filter(i => i.itemConditionType === 'FRESH')
                                .map(i => i.soiledItemId)
                            )}
                            onScanStart={(ctx) => {
                              setActiveSessionId(null);
                              setActiveScan({
                                ...ctx,
                                quantityType: "WASHED",
                                referenceId: sec.referenceId,
                              });
                              setScanStatus("ACTIVE");
                            }}


                            onScanStop={() => {
                              // Don't clear activeScan here - it will be overwritten when user clicks different column
                              setScanStatus("IDLE");
                            }}
                          />

                          <ColumnScanHeaderAction
                            label="Damaged"
                            quantityType="DAMAGED"
                            referenceId={sec.referenceId}
                            scanType="WASH_FULFILLMENT_CREATION"
                            onScanMessage={handleScanMessage}
                            inventoryItemIds={sec.rows.flatMap(r =>
                              (r.fulfillmentItems || [])
                                .filter(i => i.itemConditionType === 'DAMAGED')
                                .map(i => i.soiledItemId)
                            )}
                            onScanStart={(ctx) => {
                              setActiveSessionId(null);
                              setActiveScan({
                                ...ctx,
                                quantityType: "DAMAGED",
                                referenceId: sec.referenceId,
                              });
                              setScanStatus("ACTIVE");
                            }}



                            onScanStop={() => {
                              // Don't clear activeScan here - it will be overwritten when user clicks different column
                              setScanStatus("IDLE");
                            }}
                          />

                          <ColumnScanHeaderAction
                            label="Soiled"
                            quantityType="SOILED"
                            referenceId={sec.referenceId}
                            scanType="WASH_FULFILLMENT_CREATION"
                            onScanMessage={handleScanMessage}
                            inventoryItemIds={sec.rows.flatMap(r =>
                              (r.fulfillmentItems || [])
                                .filter(i => i.itemConditionType === 'SOILED')
                                .map(i => i.soiledItemId)
                            )}
                            onScanStop={() => {
                              // Don't clear activeScan here - it will be overwritten when user clicks different column
                              setScanStatus("IDLE");
                            }}
                            onScanStart={(ctx) => {
                              setActiveSessionId(null);
                              setActiveScan({
                                ...ctx,
                                quantityType: "SOILED",
                                referenceId: sec.referenceId,
                              });
                              setScanStatus("ACTIVE");
                            }}

                          />

                        </Box>

                        <Box
                          sx={{
                            display: "grid",
                            gridAutoRows: "minmax(52px, auto)",
                            mt: 0.5,
                          }}
                        >
                          {sec.rows.map((r, idx) => {
                            const isRowScanning =
                              scanStatus === "ACTIVE" &&
                              activeScan?.referenceId === sec.referenceId &&
                              (
                                activeScan?.productId === r.productId ||
                                activeScan?.productId == null
                              );



                            return (
                              <Box
                                key={r.productId}
                                data-agent-row-fulfillment={idx}
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: {
                                    xs: "1fr 140px 140px 140px",
                                    sm: "1fr 160px 160px 160px",
                                  },
                                  gap: 2,
                                  alignItems: "center",
                                  px: 2,
                                  py: 0.25,
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                  transition: "background-color 0.2s ease",
                                  bgcolor:
                                    idx % 2 === 1
                                      ? "action.hover"
                                      : "transparent",
                                  "&:hover": { bgcolor: "action.hover" },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  {isRowScanning && (
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        bgcolor: "success.main",
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}

                                  <Typography
                                    variant="body2"
                                    noWrap
                                    title={r.productName}
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {r.productName}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }} data-agent-field="washed">
                                  <QuantityScanInput
                                    value={r.washedQuantity ?? 0}
                                    showMax={false}
                                    quantityType="WASHED"
                                    referenceId={sec.referenceId}
                                    productId={r.productId}
                                    isScanning={
                                      scanStatus === "ACTIVE" &&
                                      activeScan?.quantityType === "WASHED" &&
                                      activeScan?.referenceId === sec.referenceId &&
                                      (
                                        activeScan?.productId === r.productId ||
                                        activeScan?.productId == null
                                      )
                                    }
                                    onChange={(val) =>
                                      updateWashedQty(sec.referenceId, r.productId, val)
                                    }
                                    onScanStart={(ctx) => {
                                      setActiveScan(ctx);
                                      setScanStatus("ACTIVE");
                                    }}
                                    onScanStop={() => {
                                      setActiveScan(null);
                                      setScanStatus("IDLE");
                                    }}
                                    onScanMessage={handleScanMessage}
                                    inventoryItemIds={(r.fulfillmentItems || [])
                                      .filter((i) => i.itemConditionType === "FRESH")
                                      .map((i) => i.soiledItemId)}
                                  />
                                </Box>


                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }} data-agent-field="damaged">
                                  <QuantityScanInput
                                    value={r.damagedQuantity ?? 0}
                                    showMax={false}
                                    quantityType="DAMAGED"
                                    referenceId={sec.referenceId}
                                    productId={r.productId}
                                    isScanning={
                                      scanStatus === "ACTIVE" &&
                                      activeScan?.quantityType === "DAMAGED" &&
                                      activeScan?.referenceId === sec.referenceId &&
                                      (
                                        activeScan?.productId === r.productId ||
                                        activeScan?.productId == null
                                      )
                                    }
                                    onChange={(val) =>
                                      updateDamagedQty(sec.referenceId, r.productId, val)
                                    }
                                    onScanStart={(ctx) => {
                                      setActiveScan(ctx);
                                      setScanStatus("ACTIVE");
                                    }}
                                    onScanStop={() => {
                                      setActiveScan(null);
                                      setScanStatus("IDLE");
                                    }}
                                    onScanMessage={handleScanMessage}
                                    inventoryItemIds={(r.fulfillmentItems || [])
                                      .filter((i) => i.itemConditionType === "DAMAGED")
                                      .map((i) => i.soiledItemId)}
                                  />
                                </Box>

                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }} data-agent-field="soiled">
                                  <QuantityScanInput
                                    value={r.soiledQuantity ?? 0}
                                    showMax={false}
                                    quantityType="SOILED"
                                    referenceId={sec.referenceId}
                                    productId={r.productId}
                                    isScanning={
                                      scanStatus === "ACTIVE" &&
                                      activeScan?.quantityType === "SOILED" &&
                                      activeScan?.referenceId === sec.referenceId &&
                                      (
                                        activeScan?.productId === r.productId ||
                                        activeScan?.productId == null
                                      )
                                    }
                                    onChange={(val) =>
                                      updateSoiledQty(sec.referenceId, r.productId, val)
                                    }
                                    onScanStart={(ctx) => {
                                      setActiveScan(ctx);
                                      setScanStatus("ACTIVE");
                                    }}
                                    onScanStop={() => {
                                      setActiveScan(null);
                                      setScanStatus("IDLE");
                                    }}
                                    onScanMessage={handleScanMessage}
                                    inventoryItemIds={(r.fulfillmentItems || [])
                                      .filter((i) => i.itemConditionType === "SOILED")
                                      .map((i) => i.soiledItemId)}
                                  />
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })()
                ) : (
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
                      No outstanding products for the selected pool in this date
                      range.
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      {/* Sticky summary bar */}
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
          {summary.rangeLabel && (
            <Chip label={`Date Cap: ${summary.rangeLabel}`} size="small" />
          )}
          {summary.vendorName && (
            <Chip label={`Vendor: ${summary.vendorName}`} size="small" />
          )}
          {summary.poolName && (
            <Chip label={`Pool: ${summary.poolName}`} size="small" />
          )}
        </Box>

        <Button
          onClick={handleDialogClose}
          size="small"
          color="secondary"
          disabled={loadingSubmit}
        >
          Cancel
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip
            title={
              !canSubmit
                ? "Vendor, Pool, Request Number, and at least one product with washed quantity are required"
                : ""
            }
          >
            <span>
              <Button
                variant="outlined"
                onClick={handleReviewWashes}
                disabled={!canSubmit || loadingReview}
                size="small"
                color="primary"
              >
                {loadingReview ? (
                  <CircularProgress size={18} />
                ) : (
                  "Review Washes"
                )}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </DialogActions>

      {knockOffDialogData && (
        <KnockOffResultDialog
          open={Boolean(knockOffDialogData)}
          onClose={() => setKnockOffDialogData(null)}
          onBack={() => setKnockOffDialogData(null)}
          onConfirm={() => handleSubmit()}
          confirmLoading={loadingSubmit}
          data={knockOffDialogData}
        />
      )}
    </Dialog>
  );
}

export default FulfillmentDialog;
