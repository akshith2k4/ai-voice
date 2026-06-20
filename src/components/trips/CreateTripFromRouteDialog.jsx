import { useEffect, useMemo, useState, useCallback } from "react";
import { useCreateTripAgent } from "../../useagent/useCreateTripAgent";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    ButtonGroup,
    TextField,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    Checkbox,
    Chip,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    Alert,
    InputAdornment,
    MenuItem,
    Skeleton,
    Divider,
} from "@mui/material";
import { Autocomplete } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { tripService } from "../../services/tripService";
import { userService } from "../../services/userService";
import { inventoryService } from "../../services/inventoryService";
import { useDcid } from "../../context/DcidContext";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

/* --------- Helpers ---------- */

const ORDER_TRIP = "ORDER_TRIP";
const WASH_TRIP = "WASH_TRIP";

const normalizeString = (str) => {
    if (str == null) return "";
    return String(str)
        .toLowerCase()
        .replace(/[\u2014\u2013-]/g, "-")
        .replace(/\s+/g, "");
};

// Strict LocalDate ("YYYY-MM-DD") for backend LocalDate
const toLocalDateOnly = (date) => {
    try {
        if (!date) return null;
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return null;
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
            d.getDate()
        )}`;
    } catch {
        return null;
    }
};

const getDeliveryTypeFromOrder = (order) => {
    if (!order) return "DELIVERY";
    if (order.leasingOrderDetails?.leasingOrderType) return order.leasingOrderDetails.leasingOrderType;
    if (order.rentalOrderDetails?.rentalOrderType) return order.rentalOrderDetails.rentalOrderType;
    if (order.washingOrderDetails?.washingOrderType) return order.washingOrderDetails.washingOrderType;
    return "DELIVERY";
};

const useDebounced = (val, ms = 300) => {
    const [v, setV] = useState(val);
    useEffect(() => {
        const t = setTimeout(() => setV(val), ms);
        return () => clearTimeout(t);
    }, [val, ms]);
    return v;
};

/* --------- Component ---------- */

export default function CreateTripFromRouteDialog({
    open,
    onClose,
    onCreated,
}) {
    const { dcid } = useDcid();
    const branchId =
        typeof window !== "undefined"
            ? Number(localStorage.getItem("branchId"))
            : null;

    // Left form
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [deliveryDate, setDeliveryDate] = useState(new Date());
    // Multiple drivers with roles
    const [selectedDriverIds, setSelectedDriverIds] = useState([]);
    const [rolesByUserId, setRolesByUserId] = useState({}); // { [userId]: role }
    const [vehicle, setVehicle] = useState(null);
    const [notes, setNotes] = useState("");

    // Right pane data
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [orders, setOrders] = useState([]); // flat list from API
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [ordersError, setOrdersError] = useState("");
    const [submitAttempted, setSubmitAttempted] = useState(false);

    // Per-customer state
    const [selectedOrderIdsByCustomer, setSelectedOrderIdsByCustomer] =
        useState({});
    const [visitNotesByCustomer, setVisitNotesByCustomer] = useState({});
    const [sequenceByCustomer, setSequenceByCustomer] = useState({});

    // Wash Request state
    const [washRequests, setWashRequests] = useState([]);
    const [loadingWashRequests, setLoadingWashRequests] = useState(false);
    const [selectedWashRequestIdsByVendor, setSelectedWashRequestIdsByVendor] = useState({});
    const [visitNotesByVendor, setVisitNotesByVendor] = useState({});
    const [sequenceByVendor, setSequenceByVendor] = useState({});
    const [enabledCustomers, setEnabledCustomers] = useState(new Set());
    const [enabledVendors, setEnabledVendors] = useState(new Set());

    // Filters (fixed missing state)
    const [orderSearch, _setOrderSearch] = useState("");
    const [statusFilter, _setStatusFilter] = useState("ALL");
    const debouncedSearch = useDebounced(orderSearch, 250);
    const [resolvedTripType, setResolvedTripType] = useState(ORDER_TRIP);
    const isCustomerTrip = resolvedTripType === ORDER_TRIP;

    useEffect(() => {
        // When route changes, clear selection; we'll enable only customers that have orders after fetch
        if (!selectedRoute) {
            setEnabledCustomers(new Set());
        }
    }, [selectedRoute]);

    const activateCustomerTrip = useCallback(() => {
        setResolvedTripType(ORDER_TRIP);
        setEnabledVendors(new Set());
    }, []);

    const activateWashTrip = useCallback(() => {
        setResolvedTripType(WASH_TRIP);
        setEnabledCustomers(new Set());
    }, []);

    const toggleCustomerEnabled = useCallback((customerId) => {
        activateCustomerTrip();
        setEnabledCustomers((prev) => {
            const next = new Set(prev);
            if (next.has(customerId)) next.delete(customerId);
            else next.add(customerId);
            return next;
        });
    }, [activateCustomerTrip]);

    const selectedCustomerIds = useMemo(
        () => Array.from(enabledCustomers),
        [enabledCustomers]
    );

    // Derived
    const customers = useMemo(
        () => (selectedRoute?.points || [])
            .filter(p => p.partyType === "CUSTOMER")
            .map(p => ({ ...p, id: p.partyId })),
        [selectedRoute]
    );
    const vendors = useMemo(
        () => (selectedRoute?.points || [])
            .filter(p => p.partyType === "LAUNDRY_VENDOR")
            .map(p => ({ ...p, id: p.partyId })),
        [selectedRoute]
    );

    // Load dropdown data on open
    const [warehouses, setWarehouses] = useState([]);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                setSubmitAttempted(false);
                const [routesResp, d, v, w] = await Promise.all([
                    tripService.getRoutes(),
                    userService.getActiveUsers(branchId),
                    tripService.getVehiclesByBranch(branchId),
                    inventoryService.getWarehouses(),
                ]);
                setRoutes(routesResp || []);
                setDrivers(d || []);
                setVehicles(v || []);
                setWarehouses(Array.isArray(w) ? w : []);
            } catch (e) {
                console.error("Failed to load dropdowns", e);
            }
        })();
    }, [open, branchId]);

    // Fetch orders and wash requests when route/date changes
    useEffect(() => {
        const run = async () => {
            setOrdersError("");
            if (!selectedRoute || !deliveryDate) {
                setOrders([]);
                setWashRequests([]);
                return;
            }
            const allCustomerIds = customers.map((c) => Number(c.id));
            const allVendorIds = vendors.map((v) => Number(v.id));

            setLoadingOrders(true);
            setLoadingWashRequests(true);
            try {
                const tasks = await tripService.fetchScheduledTasksByDate(allCustomerIds, allVendorIds, deliveryDate);
                
                // 1. Process Orders (Tasks of type ORDER)
                const orderTasks = (tasks || []).filter(t => t.taskType === "ORDER");
                const oData = orderTasks.map(t => ({ ...t.originalDetails, id: t.taskId, partyId: t.partyId, partyName: t.partyName }));
                setOrders(oData);
                
                const groupedO = {};
                oData.forEach((o) => {
                    const cid = o.customerId || o.partyId;
                    if (!groupedO[cid]) groupedO[cid] = new Set();
                    groupedO[cid].add(o.id);
                });
                setSelectedOrderIdsByCustomer(groupedO);
                setEnabledCustomers(new Set(Object.keys(groupedO).map(Number)));
                setSequenceByCustomer((prev) => {
                    const next = { ...prev };
                    Object.keys(groupedO).forEach((cid, idx) => {
                        if (next[cid] == null) next[cid] = idx + 1;
                    });
                    return next;
                });

                // 2. Process Wash Requests (Tasks of type WASH_REQUEST)
                const washTasks = (tasks || []).filter(t => t.taskType === "WASH_REQUEST");
                const wData = washTasks.map(t => ({ ...t.originalDetails, id: t.taskId, partyId: t.partyId, partyName: t.partyName }));
                setWashRequests(wData);
                
                const groupedW = {};
                wData.forEach((wr) => {
                    const vid = wr.vendorId || wr.partyId;
                    if (!groupedW[vid]) groupedW[vid] = new Set();
                    groupedW[vid].add(wr.id);
                });
                setSelectedWashRequestIdsByVendor(groupedW);
                
                // If we have wash requests but no orders, and it's a new route, maybe suggest switching?
                // For now, we just enable the vendors that have tasks.
                const vendorIdsWithTasks = Object.keys(groupedW).map(Number);
                setEnabledVendors(new Set(vendorIdsWithTasks));

                setSequenceByVendor((prev) => {
                    const next = { ...prev };
                    Object.keys(groupedW).forEach((vid, idx) => {
                        if (next[vid] == null) next[vid] = idx + 1;
                    });
                    return next;
                });

                // Only default to WASH_TRIP if there are ONLY wash requests and no orders
                if (orderTasks.length === 0 && washTasks.length > 0 && resolvedTripType === ORDER_TRIP) {
                    setResolvedTripType(WASH_TRIP);
                }

            } catch (e) {
                console.error("Failed to fetch tasks", e);
                setOrdersError("Could not load tasks. Try changing date or route.");
            } finally {
                setLoadingOrders(false);
                setLoadingWashRequests(false);
            }
        };
        run();
    }, [selectedRoute, deliveryDate, customers, vendors]);

    // Grouped for fast lookup
    const groupedOrdersByCustomer = useMemo(() => {
        const g = {};
        (orders || []).forEach((o) => {
            const pid = o.partyId || o.customerId;
            if (!g[pid]) g[pid] = [];
            g[pid].push(o);
        });
        return g;
    }, [orders]);

    const groupedWashRequestsByVendor = useMemo(() => {
        const g = {};
        (washRequests || []).forEach((wr) => {
            const pid = wr.partyId || wr.vendorId;
            if (!g[pid]) g[pid] = [];
            g[pid].push(wr);
        });
        return g;
    }, [washRequests]);

    // Customers with visits
    const customersWithOrders = useMemo(
        () => customers.filter((c) => (groupedOrdersByCustomer[c.id] || []).length > 0),
        [customers, groupedOrdersByCustomer]
    );

    const vendorsWithWashRequests = useMemo(
        () => vendors.filter((v) => (groupedWashRequestsByVendor[v.id] || []).length > 0),
        [vendors, groupedWashRequestsByVendor]
    );

    // Apply filters to grouped
    const filteredGroupedOrdersByCustomer = useMemo(() => {
        const byId = {};
        const s = debouncedSearch.trim().toLowerCase();
        const passStatus = (o) =>
            statusFilter === "ALL" || o?.status === statusFilter;

        customersWithOrders.forEach((c) => {
            let list = groupedOrdersByCustomer[c.id] || [];
            if (s) {
                list = list.filter((o) => {
                    const ref = String(
                        o?.referenceNumber || o?.id || ""
                    ).toLowerCase();
                    return (
                        ref.includes(s) ||
                        (c.name || "").toLowerCase().includes(s)
                    );
                });
            }
            list = list.filter(passStatus);
            byId[c.id] = list;
        });
        return byId;
    }, [customersWithOrders, groupedOrdersByCustomer, debouncedSearch, statusFilter]);

    // Counters
    const selectedOrdersCount = useMemo(() => {
        let sum = 0;
        for (const [cidStr, set] of Object.entries(
            selectedOrderIdsByCustomer || {}
        )) {
            const cid = Number(cidStr);
            if (enabledCustomers.has(cid)) sum += set?.size || 0;
        }
        return sum;
    }, [selectedOrderIdsByCustomer, enabledCustomers]);

    const selectedWashRequestsCount = useMemo(() => {
        let sum = 0;
        for (const [vidStr, set] of Object.entries(
            selectedWashRequestIdsByVendor || {}
        )) {
            const vid = Number(vidStr);
            if (enabledVendors.has(vid)) sum += set?.size || 0;
        }
        return sum;
    }, [selectedWashRequestIdsByVendor, enabledVendors]);

    // Toggle a single order
    const toggleOrderSelection = useCallback((customerId, orderId) => {
        activateCustomerTrip();
        setSelectedOrderIdsByCustomer((prev) => {
            const pid = customerId;
            const set = new Set(prev[pid] || []);
            if (set.has(orderId)) set.delete(orderId);
            else set.add(orderId);
            return { ...prev, [pid]: set };
        });
    }, [activateCustomerTrip]);

    // Toggle all orders for one customer (filtered view respected)
    const toggleAllForCustomer = useCallback(
        (customerId) => {
            activateCustomerTrip();
            if (!enabledCustomers.has(customerId)) return; // NEW guard
            setSelectedOrderIdsByCustomer((prev) => {
                const visible =
                    filteredGroupedOrdersByCustomer[customerId] || [];
                const set = new Set(prev[customerId] || []);
                const allSelected =
                    visible.length > 0 && visible.every((o) => set.has(o.id));
                const next = new Set(set);
                if (allSelected) visible.forEach((o) => next.delete(o.id));
                else visible.forEach((o) => next.add(o.id));
                return { ...prev, [customerId]: next };
            });
        },
        [activateCustomerTrip, filteredGroupedOrdersByCustomer, enabledCustomers]
    );

    // Wash Request toggles
    const toggleVendorEnabled = useCallback((vendorId) => {
        activateWashTrip();
        setEnabledVendors((prev) => {
            const next = new Set(prev);
            if (next.has(vendorId)) next.delete(vendorId);
            else next.add(vendorId);
            return next;
        });
    }, [activateWashTrip]);

    const toggleWashRequestSelection = useCallback((vendorId, wrId) => {
        activateWashTrip();
        setSelectedWashRequestIdsByVendor((prev) => {
            const pid = vendorId;
            const set = new Set(prev[pid] || []);
            if (set.has(wrId)) set.delete(wrId);
            else set.add(wrId);
            return { ...prev, [pid]: set };
        });
    }, [activateWashTrip]);

    const toggleAllForVendor = useCallback(
        (vendorId) => {
            activateWashTrip();
            if (!enabledVendors.has(vendorId)) return;
            setSelectedWashRequestIdsByVendor((prev) => {
                const visible = groupedWashRequestsByVendor[vendorId] || [];
                const set = new Set(prev[vendorId] || []);
                const allSelected = visible.length > 0 && visible.every((wr) => set.has(wr.id));
                const next = new Set(set);
                if (allSelected) visible.forEach((wr) => next.delete(wr.id));
                else visible.forEach((wr) => next.add(wr.id));
                return { ...prev, [vendorId]: next };
            });
        },
        [activateWashTrip, groupedWashRequestsByVendor, enabledVendors]
    );

    const handleCreate = async () => {
        // Client-side required fields: route, delivery date, driver, vehicle
        if (!selectedRoute || !deliveryDate || !vehicle || !selectedDriverIds || selectedDriverIds.length === 0) {
            setSubmitAttempted(true);
            return;
        }
        try {
            const assignedPeople = selectedDriverIds.map((uid, idx) => ({
                userId: uid,
                role: rolesByUserId[uid] || (idx === 0 ? "DRIVER" : "HELPER"),
            }));

            const customerVisits = selectedCustomerIds.map((cid) => ({
                partyId: cid,
                partyType: "CUSTOMER",
                sequence: Number(sequenceByCustomer[cid]) || 0,
                notes: visitNotesByCustomer[cid] || "",
                items: Array.from(selectedOrderIdsByCustomer[cid] || []).flatMap((orderId) => {
                    const orderObj = orders.find((o) => o.id === orderId);
                    const dType = getDeliveryTypeFromOrder(orderObj);

                    if (dType === "BOTH") {
                        return [
                            {
                                referenceId: orderId,
                                referenceType: "ORDER",
                                deliveryType: "DELIVERY",
                            },
                            {
                                referenceId: orderId,
                                referenceType: "ORDER",
                                deliveryType: "PICKUP",
                            }
                        ];
                    }
                    return [{
                        referenceId: orderId,
                        referenceType: "ORDER",
                        deliveryType: dType,
                    }];
                }),
            }));

            const vendorVisits = Array.from(enabledVendors).map((vid) => ({
                partyId: vid,
                partyType: "LAUNDRY_VENDOR",
                sequence: Number(sequenceByVendor[vid]) || 0,
                notes: visitNotesByVendor[vid] || "",
                items: Array.from(selectedWashRequestIdsByVendor[vid] || []).map((wrId) => ({
                    referenceId: wrId,
                    referenceType: "WASH_REQUEST",
                    deliveryType: "BOTH",
                })),
            }));

            const payload = {
                routeName: selectedRoute.name,
                routeId: selectedRoute.id,
                deliveryDate: toLocalDateOnly(deliveryDate),
                vehicleId: vehicle?.id,
                notes,
                branchId: localStorage.getItem("branchId"),
                dcId: dcid,
                tripType: resolvedTripType,
                assignedPeople,
                visitRequests: isCustomerTrip ? customerVisits : vendorVisits,
            };

            await tripService.createTripFromRoute(payload);

            onCreated?.();
            resetStateAndClose();
        } catch (e) {
            console.error("Failed to create trip and visits", e);
        }
    };

    const resetStateAndClose = () => {
        setSelectedRoute(null);
        setDeliveryDate(new Date());
        setSelectedDriverIds([]);
        setRolesByUserId({});
        setVehicle(null);
        setNotes("");
        setOrders([]);
        setWashRequests([]);
        setSelectedOrderIdsByCustomer({});
        setSelectedWashRequestIdsByVendor({});
        setVisitNotesByCustomer({});
        setVisitNotesByVendor({});
        setSequenceByCustomer({});
        setSequenceByVendor({});
        setEnabledCustomers(new Set());
        setEnabledVendors(new Set());
        setResolvedTripType(ORDER_TRIP);
        setSubmitAttempted(false);
        onClose?.();
    };

    useCreateTripAgent({
        open,
        routes,
        drivers,
        vehicles,
        setResolvedTripType,
        setSelectedRoute,
        setDeliveryDate,
        setSelectedDriverIds,
        rolesByUserId,
        setRolesByUserId,
        setVehicle,
        setNotes,
        customersWithOrders,
        enabledCustomers,
        toggleCustomerEnabled,
        setSequenceByCustomer,
        setVisitNotesByCustomer,
        resetStateAndClose,
        normalizeString,
        WASH_TRIP,
        ORDER_TRIP,
    });

    /* ---------- UI ---------- */

    return (
        <Dialog
            open={open}
            onClose={resetStateAndClose}
            fullWidth
            maxWidth="lg"
        >
            <DialogTitle sx={{ pb: 0.5 }}>
                <Typography variant="h6">Create Trip (New)</Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ pt: 2 }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
                        gap: 2,
                        alignItems: "start",
                    }}
                >
                    {/* LEFT: FORM */}
                    <Box
                        sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            p: 2,
                            bgcolor: "background.paper",
                        }}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, mb: 1 }}
                        >
                            Trip Details
                        </Typography>

                        <Box data-agent-field="tripType" sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2 }}>
                                Select Trip Type
                            </Typography>
                            <ButtonGroup name="tripType" id="tripType" fullWidth size="small" variant="outlined">
                                <Button
                                    onClick={() => setResolvedTripType(ORDER_TRIP)}
                                    sx={(theme) => ({ 
                                        bgcolor: isCustomerTrip ? `${theme.palette.primary.main}14` : 'white',
                                        color: isCustomerTrip ? 'primary.main' : 'text.secondary',
                                        borderColor: isCustomerTrip ? 'primary.main !important' : 'divider !important',
                                        zIndex: isCustomerTrip ? 2 : 1,
                                        fontWeight: isCustomerTrip ? 700 : 500,
                                        textTransform: 'none',
                                        py: 1,
                                        '&:hover': {
                                            bgcolor: isCustomerTrip ? `${theme.palette.primary.main}1F` : 'rgba(0,0,0,0.04)',
                                            borderColor: isCustomerTrip ? 'primary.main !important' : 'divider !important',
                                        }
                                    })}
                                >
                                    Customer Trip
                                </Button>
                                <Button
                                    onClick={() => setResolvedTripType(WASH_TRIP)}
                                    sx={(theme) => ({ 
                                        bgcolor: !isCustomerTrip ? `${theme.palette.primary.main}14` : 'white',
                                        color: !isCustomerTrip ? 'primary.main' : 'text.secondary',
                                        borderColor: !isCustomerTrip ? 'primary.main !important' : 'divider !important',
                                        zIndex: !isCustomerTrip ? 2 : 1,
                                        fontWeight: !isCustomerTrip ? 700 : 500,
                                        textTransform: 'none',
                                        py: 1,
                                        '&:hover': {
                                            bgcolor: !isCustomerTrip ? `${theme.palette.primary.main}1F` : 'rgba(0,0,0,0.04)',
                                            borderColor: !isCustomerTrip ? 'primary.main !important' : 'divider !important',
                                        }
                                    })}
                                >
                                    Laundry Trip
                                </Button>
                            </ButtonGroup>

                        </Box>

                        <FormControl fullWidth margin="dense" disabled>
                            <InputLabel>Warehouse</InputLabel>
                            <Select value={dcid ?? ""} label="Warehouse" disabled>
                                {warehouses.map((w) => (
                                    <MenuItem key={w.id} value={w.id}>
                                        {w.name || `Warehouse ${w.id}`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Choose route, date, delivery team and vehicle for your <strong>{isCustomerTrip ? 'Order Trip' : 'Wash Trip'}</strong>.
                        </Typography>

                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1.5,
                            }}
                        >
                            {/* Route */}
                            <Box data-agent-field="route" sx={{ width: "100%" }}>
                                <TextField
                                    select
                                    label="Route"
                                    size="small"
                                    name="route"
                                    id="route"
                                    value={selectedRoute?.id ?? ""}
                                    onChange={(e) => {
                                        const v = routes.find(
                                            (r) => r.id === Number(e.target.value)
                                        );
                                        setSelectedRoute(v || null);
                                    }}
                                    required
                                    error={submitAttempted && !selectedRoute}
                                    helperText={submitAttempted && !selectedRoute ? "Route is required" : ""}
                                    fullWidth
                                >
                                    {routes.map((r) => (
                                        <MenuItem key={r.id} value={r.id}>
                                            {r.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* Date */}
                            <Box sx={{ display: "flex", gap: 1 }} data-agent-field="deliveryDate">
                                <DatePicker
                                    label="Delivery Date"
                                    value={deliveryDate}
                                    onChange={(d) => setDeliveryDate(d)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: "small",
                                            required: true,
                                            name: "deliveryDate",
                                            id: "deliveryDate",
                                            error: submitAttempted && !deliveryDate,
                                            helperText:
                                                submitAttempted && !deliveryDate
                                                    ? "Delivery Date is required"
                                                    : undefined,
                                        },
                                    }}
                                />
                            </Box>

                            {/* Delivery Team */}
                            <Box data-agent-field="deliveryTeam" sx={{ width: "100%" }}>
                                <Autocomplete
                                    multiple
                                    options={drivers}
                                getOptionLabel={(o) => o?.name || String(o?.id || '')}
                                value={(selectedDriverIds || []).map((id) => drivers.find((d) => d.id === id)).filter(Boolean)}
                                disableClearable
                                slotProps={{
                                    listbox: {
                                        sx: {
                                            p: 0,
                                            '& .MuiAutocomplete-option': {
                                                minHeight: 'auto',
                                                py: 0.5,
                                                px: 1,
                                                fontSize: '0.9rem',
                                            },
                                        },
                                    },
                                    paper: { sx: { mt: 0.5 } },
                                }}
                                onChange={(_, val) => {
                                    const ids = (val || []).map((v) => v.id);
                                    setSelectedDriverIds(ids);
                                    const next = { ...rolesByUserId };
                                    ids.forEach((uid, idx) => {
                                        if (!next[uid]) next[uid] = idx === 0 ? 'DRIVER' : 'HELPER';
                                    });
                                    Object.keys(next).forEach((uid) => {
                                        if (!ids.includes(Number(uid)) && !ids.includes(uid)) delete next[uid];
                                    });
                                    setRolesByUserId(next);
                                }}
                                disableCloseOnSelect
                                renderOption={(props, option, { selected }) => (
                                    <li {...props} key={option.id} style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 8 }}>
                                        <Checkbox size="small" style={{ marginRight: 6 }} checked={selected} />
                                        {option.name}
                                    </li>
                                )}
                                renderTags={(value) => {
                                    const text = (value || []).map((u) => u?.name).filter(Boolean).join(', ');
                                    return (
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                flexWrap: 'nowrap',
                                                overflowX: 'auto',
                                                overflowY: 'hidden',
                                                maxWidth: '100%',
                                                whiteSpace: 'nowrap',
                                                scrollbarWidth: 'thin',
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{text}</Typography>
                                        </Box>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Delivery Team"
                                        name="deliveryTeam"
                                        size="small"
                                        required
                                        error={submitAttempted && (!selectedDriverIds || selectedDriverIds.length === 0)}
                                        helperText={submitAttempted && (!selectedDriverIds || selectedDriverIds.length === 0) ? 'At least one team member is required' : ''}
                                    />
                                )}
                                fullWidth
                                sx={{
                                    '& .MuiInputBase-root': {
                                        position: 'relative',
                                        alignItems: 'center',
                                        minHeight: 44,
                                        pt: 0.5,
                                        pb: 0.5,
                                        pr: '56px',
                                    },
                                    // Prevent multiline by keeping input root on one line
                                    '& .MuiAutocomplete-inputRoot': {
                                        flexWrap: 'nowrap',
                                    },
                                    '& .MuiChip-root': { height: 24, m: 0.25 },
                                    '& .MuiAutocomplete-input': {
                                        py: 0.5,
                                        minWidth: 8,
                                        flex: '0 0 auto',
                                    },
                                }}
                            />
                            </Box>

                            {/* Role pickers per selected driver */}
                            {selectedDriverIds && selectedDriverIds.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    {selectedDriverIds.map((uid, idx) => {
                                        const user = drivers.find((d) => d.id === uid);
                                        const role = rolesByUserId[uid] || (idx === 0 ? 'DRIVER' : 'HELPER');
                                        return (
                                            <Box key={uid} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                                <Typography sx={{ minWidth: 140 }}>{user?.name || uid}</Typography>
                                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                                    <InputLabel>Role</InputLabel>
                                                    <Select
                                                        label="Role"
                                                        value={role}
                                                        onChange={(e) => setRolesByUserId((prev) => ({ ...prev, [uid]: e.target.value }))}
                                                    >
                                                        <MenuItem value="DRIVER">DRIVER</MenuItem>
                                                        <MenuItem value="HELPER">HELPER</MenuItem>
                                                    </Select>
                                                </FormControl>
                                                <IconButton
                                                    aria-label="Remove team member"
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedDriverIds((prev) => prev.filter((id) => id !== uid));
                                                        setRolesByUserId((prev) => {
                                                            const n = { ...prev };
                                                            delete n[uid];
                                                            return n;
                                                        });
                                                    }}
                                                >
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            )}

                            {/* Vehicle */}
                            <Box data-agent-field="vehicle" sx={{ width: "100%" }}>
                                <TextField
                                    select
                                    label="Vehicle"
                                    size="small"
                                    name="vehicle"
                                    id="vehicle"
                                    value={vehicle?.id ?? ""}
                                    onChange={(e) => {
                                        const v = vehicles.find(
                                            (v) => v.id === Number(e.target.value)
                                        );
                                        setVehicle(v || null);
                                    }}
                                    required
                                    error={submitAttempted && !vehicle}
                                    helperText={
                                        submitAttempted && !vehicle
                                            ? "Vehicle is required"
                                            : vehicle
                                                ? "Vehicle reserved for this trip"
                                                : ""
                                    }
                                    fullWidth
                                >
                                    <MenuItem value="">—</MenuItem>
                                    {vehicles.map((v) => (
                                        <MenuItem key={v.id} value={v.id}>
                                            {v.vehicleNumber}
                                            {v.type ? ` — ${v.type}` : ""}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            <Box data-agent-field="notes" sx={{ width: "100%" }}>
                                <TextField
                                    label="Trip Notes"
                                    name="notes"
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    fullWidth
                                    size="small"
                                    placeholder="Any instructions for this trip (optional)"
                                />
                            </Box>

                            {selectedRoute && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ mb: 0.75, fontWeight: 700 }}
                                    >
                                        {isCustomerTrip ? 'Customers' : 'Vendors'} in “{selectedRoute.name}”
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 0.75,
                                            p: 1,
                                            border: "1px dashed",
                                            borderColor: "divider",
                                            borderRadius: 1,
                                            bgcolor: "background.default",
                                            maxHeight: 140,
                                            overflow: "auto",
                                        }}
                                    >
                                        {(isCustomerTrip ? customers : vendors).map((p) => (
                                            <Chip
                                                key={p.id}
                                                label={p.name}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {isCustomerTrip ? customers.length : vendors.length} {isCustomerTrip ? 'customers' : 'vendors'} on this
                                        route
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* RIGHT: ORDERS / WASH REQUESTS ACCORDIONS */}
                    <Box>
                        <Box sx={{ borderBottom: 1, borderColor: "divider", pb: 1,mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                             <Typography variant="subtitle1" sx={{ fontWeight: 700, px: 1 }}>
                                {isCustomerTrip ? `Pending Orders (${selectedOrdersCount})` : `Pending Wash Requests (${selectedWashRequestsCount})`}
                             </Typography>
                             <Box sx={{ px: 1 }}>
                                {isCustomerTrip ? (
                                    <Chip label={`${orders.length} Available`} size="small" variant="outlined" color="primary" />
                                ) : (
                                    <Chip label={`${washRequests.length} Available`} size="small" variant="outlined" color="secondary" />
                                )}
                             </Box>
                        </Box>

                        {isCustomerTrip && (
                            <>
                                {/* Loading / Error / Empty */}
                                {loadingOrders && (
                                    <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
                                        {[...Array(4)].map((_, i) => (
                                            <Skeleton
                                                key={i}
                                                variant="rounded"
                                                height={60}
                                            />
                                        ))}
                                    </Box>
                                )}

                                {!loadingOrders && ordersError && (
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        {ordersError}
                                    </Alert>
                                )}

                                {!loadingOrders &&
                                    selectedRoute &&
                                    customers.length === 0 && (
                                        <Alert severity="info">
                                            No customers on the selected route.
                                        </Alert>
                                    )}
                            </>
                        )}

                        {!isCustomerTrip && (
                            <>
                                {/* Loading / Error / Empty */}
                                {loadingWashRequests && (
                                    <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
                                        {[...Array(4)].map((_, i) => (
                                            <Skeleton
                                                key={i}
                                                variant="rounded"
                                                height={60}
                                            />
                                        ))}
                                    </Box>
                                )}

                                {!loadingWashRequests &&
                                    selectedRoute &&
                                    vendors.length === 0 && (
                                        <Alert severity="info">
                                            No vendors on the selected route.
                                        </Alert>
                                    )}
                            </>
                        )}

                        {isCustomerTrip && (
                            <>
                                {!loadingOrders &&
                                    selectedRoute &&
                                    customersWithOrders.length > 0 && (
                                        <Box
                                            sx={{
                                                display: "grid",
                                                gap: 1,
                                                maxHeight: 520,
                                                overflow: "auto",
                                                pr: 0.5,
                                            }}
                                        >
                                            {customersWithOrders.map((cust, idx) => {
                                                const customerId = Number(cust.id);
                                                const isEnabled =
                                                    enabledCustomers.has(customerId);
                                                const visibleOrders =
                                                    filteredGroupedOrdersByCustomer[
                                                    customerId
                                                    ] || [];
                                                const selectedSet =
                                                    selectedOrderIdsByCustomer[
                                                    customerId
                                                    ] || new Set();
                                                const allSelected =
                                                    visibleOrders.length > 0 &&
                                                    visibleOrders.every((o) =>
                                                        selectedSet.has(o.id)
                                                    );

                                                return (
                                                    <Accordion
                                                        key={customerId}
                                                        disableGutters
                                                        square={false}
                                                        data-agent-row-customer={idx}
                                                        sx={{
                                                            border: "1px solid",
                                                            borderColor: "divider",
                                                            borderRadius: 1,
                                                            bgcolor: "background.paper",
                                                            boxShadow: 0,
                                                            borderLeft: "6px solid #1976d2",
                                                            "&:before": {
                                                                display: "none",
                                                            },
                                                            "&:hover": { boxShadow: 1 },
                                                        }}
                                                    >
                                                        <AccordionSummary
                                                            expandIcon={
                                                                <ExpandMoreIcon />
                                                            }
                                                        >
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    flexWrap: "wrap",
                                                                    gap: 1,
                                                                    alignItems:
                                                                        "center",
                                                                    width: "100%",
                                                                    opacity: isEnabled
                                                                        ? 1
                                                                        : 0.6,
                                                                }}
                                                            >
                                                                {/* Include/Exclude customer */}
                                                                <Tooltip
                                                                    title={
                                                                        isEnabled
                                                                            ? "Exclude this customer"
                                                                            : "Include this customer"
                                                                    }
                                                                >
                                                                    <Checkbox
                                                                        size="small"
                                                                        checked={
                                                                            isEnabled
                                                                        }
                                                                        onChange={() =>
                                                                            toggleCustomerEnabled(
                                                                                customerId
                                                                            )
                                                                        }
                                                                        data-agent-field="selected"
                                                                        name="selected"
                                                                        id={`selected-${customerId}`}
                                                                    />
                                                                </Tooltip>

                                                                <Typography
                                                                    sx={{
                                                                        fontWeight: 700,
                                                                        width: 220,
                                                                        whiteSpace:
                                                                            "normal",
                                                                        wordBreak:
                                                                            "break-word",
                                                                    }}
                                                                >
                                                                    {cust.name}
                                                                </Typography>

                                                                <Chip
                                                                    size="small"
                                                                    label={`${visibleOrders.length} orders`}
                                                                    color="primary"
                                                                    variant="outlined"
                                                                />

                                                                {/* Sequence */}
                                                                <Box
                                                                    sx={{
                                                                        display: "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        gap: 0.5,
                                                                    }}
                                                                >
                                                                    <TextField
                                                                        value={
                                                                            sequenceByCustomer[
                                                                            customerId
                                                                            ] ?? ""
                                                                        }
                                                                        onChange={(e) =>
                                                                            setSequenceByCustomer(
                                                                                (
                                                                                    prev
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [customerId]:
                                                                                        Number(
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        ),
                                                                                })
                                                                            )
                                                                        }
                                                                        size="small"
                                                                        sx={{
                                                                            width: 80,
                                                                        }}
                                                                        label="Seq"
                                                                        type="number"
                                                                        inputProps={{
                                                                            min: 0,
                                                                        }}
                                                                        disabled={
                                                                            !isEnabled
                                                                        }
                                                                        data-agent-field="sequence"
                                                                        name="sequence"
                                                                        id={`sequence-${customerId}`}
                                                                    />
                                                                </Box>

                                                                {/* Visit notes */}
                                                                <TextField
                                                                    value={
                                                                        visitNotesByCustomer[
                                                                        customerId
                                                                        ] || ""
                                                                    }
                                                                    onChange={(e) =>
                                                                        setVisitNotesByCustomer(
                                                                            (prev) => ({
                                                                                ...prev,
                                                                                [customerId]:
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                            })
                                                                        )
                                                                    }
                                                                    size="small"
                                                                    placeholder="Visit notes"
                                                                    sx={{
                                                                        ml: 1,
                                                                        width: 260,
                                                                    }}
                                                                    disabled={
                                                                        !isEnabled
                                                                    }
                                                                    data-agent-field="visitNotes"
                                                                    name="visitNotes"
                                                                    id={`visitNotes-${customerId}`}
                                                                />
                                                            </Box>
                                                        </AccordionSummary>

                                                        <AccordionDetails
                                                            sx={{
                                                                bgcolor:
                                                                    "background.default",
                                                                pt: 1,
                                                            }}
                                                        >
                                                            {visibleOrders.length ===
                                                                0 ? (
                                                                <Typography
                                                                    variant="body2"
                                                                    color="text.secondary"
                                                                    sx={{ p: 1 }}
                                                                >
                                                                    {isEnabled
                                                                        ? "No orders for current filters. You can still schedule a visit without orders."
                                                                        : "Customer excluded. Enable to view and pick orders."}
                                                                </Typography>
                                                            ) : (
                                                                <Box
                                                                    sx={{
                                                                        px: 1,
                                                                        pb: 1,
                                                                    }}
                                                                >
                                                                    {/* Header row — sticky */}
                                                                    <Box
                                                                        sx={{
                                                                            display:
                                                                                "grid",
                                                                            gridTemplateColumns:
                                                                                "120px 1fr 120px 120px 180px",
                                                                            gap: 1,
                                                                            position:
                                                                                "sticky",
                                                                            top: 0,
                                                                            zIndex: 1,
                                                                            bgcolor:
                                                                                "background.paper",
                                                                            borderBottom:
                                                                                "1px solid",
                                                                            borderColor:
                                                                                "divider",
                                                                            py: 0.5,
                                                                        }}
                                                                    >
                                                                        {/* Pick + Select All */}
                                                                        <Box
                                                                            sx={{
                                                                                display:
                                                                                    "flex",
                                                                                alignItems:
                                                                                    "center",
                                                                                justifyContent:
                                                                                    "center",
                                                                                gap: 0.5,
                                                                            }}
                                                                        >
                                                                            <Tooltip
                                                                                title={
                                                                                    allSelected
                                                                                        ? "Clear all visible"
                                                                                        : "Select all visible"
                                                                                }
                                                                            >
                                                                                <span>
                                                                                    <Checkbox
                                                                                        size="small"
                                                                                        checked={
                                                                                            allSelected
                                                                                        }
                                                                                        onChange={() =>
                                                                                            toggleAllForCustomer(
                                                                                                customerId
                                                                                            )
                                                                                        }
                                                                                        disabled={
                                                                                            !isEnabled ||
                                                                                            visibleOrders.length ===
                                                                                            0
                                                                                        }
                                                                                    />
                                                                                </span>
                                                                            </Tooltip>
                                                                            <Typography
                                                                                variant="caption"
                                                                                color="text.secondary"
                                                                            >
                                                                                Pick
                                                                            </Typography>
                                                                        </Box>

                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                        >
                                                                            Order Ref
                                                                        </Typography>
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                        >
                                                                            Status
                                                                        </Typography>
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                        >
                                                                            Type
                                                                        </Typography>
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                        >
                                                                            Order Date
                                                                        </Typography>
                                                                    </Box>

                                                                    {/* Rows */}
                                                                    <Box
                                                                        sx={{
                                                                            display:
                                                                                "grid",
                                                                            gridAutoRows:
                                                                                "minmax(40px, auto)",
                                                                            mt: 0.5,
                                                                        }}
                                                                    >
                                                                        {visibleOrders.map(
                                                                            (
                                                                                o,
                                                                                idx
                                                                            ) => {
                                                                                const checked =
                                                                                    selectedSet.has(
                                                                                        o.id
                                                                                    );
                                                                                const orderDate =
                                                                                    o.orderDate
                                                                                        ? new Date(
                                                                                            o.orderDate
                                                                                        ).toLocaleString()
                                                                                        : "-";
                                                                                return (
                                                                                    <Box
                                                                                        key={
                                                                                            o.id
                                                                                        }
                                                                                        sx={{
                                                                                            display:
                                                                                                "grid",
                                                                                            gridTemplateColumns:
                                                                                                "120px 1fr 120px 120px 180px",
                                                                                            gap: 1,
                                                                                            alignItems:
                                                                                                "center",
                                                                                            px: 0,
                                                                                            py: 0.75,
                                                                                            borderRadius: 1,
                                                                                            ...(idx %
                                                                                                2 ===
                                                                                                1
                                                                                                ? {
                                                                                                    bgcolor:
                                                                                                        "action.hover",
                                                                                                }
                                                                                                : {}),
                                                                                            "&:hover":
                                                                                            {
                                                                                                bgcolor:
                                                                                                    "action.selected",
                                                                                            },
                                                                                        }}
                                                                                    >
                                                                                        <Box
                                                                                            sx={{
                                                                                                display:
                                                                                                    "flex",
                                                                                                justifyContent:
                                                                                                    "center",
                                                                                            }}
                                                                                        >
                                                                                            <Checkbox
                                                                                                size="small"
                                                                                                checked={
                                                                                                    checked
                                                                                                }
                                                                                                onChange={() =>
                                                                                                    toggleOrderSelection(
                                                                                                        customerId,
                                                                                                        o.id
                                                                                                    )
                                                                                                }
                                                                                                disabled={
                                                                                                    !isEnabled
                                                                                                }
                                                                                            />
                                                                                        </Box>

                                                                                        <Typography>
                                                                                            {o.referenceNumber ||
                                                                                                o.id}
                                                                                        </Typography>
                                                                                        <Typography>
                                                                                            {o.status ||
                                                                                                "-"}
                                                                                        </Typography>
                                                                                        <Typography>
                                                                                            {o.orderType ||
                                                                                                "-"}
                                                                                        </Typography>
                                                                                        <Typography>
                                                                                            {
                                                                                                orderDate
                                                                                            }
                                                                                        </Typography>
                                                                                    </Box>
                                                                                );
                                                                            }
                                                                        )}
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                        </AccordionDetails>
                                                    </Accordion>
                                                );
                                            })}
                                        </Box>
                                    )}

                                {selectedRoute && orders.length === 0 && !ordersError && (
                                    <Box sx={{ p: 3, border: "1px dashed", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No orders found for the selected date. You can still create a trip with customers only.
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}

                        {!isCustomerTrip && (
                            <>
                                {!loadingWashRequests && selectedRoute && vendorsWithWashRequests.length > 0 && (
                                    <Box sx={{ display: "grid", gap: 1, maxHeight: 520, overflow: "auto", pr: 0.5 }}>
                                        {vendorsWithWashRequests.map((vend) => {
                                            const vendorId = Number(vend.id);
                                            const isEnabled = enabledVendors.has(vendorId);
                                            const visibleWR = groupedWashRequestsByVendor[vendorId] || [];
                                            const selectedSet = selectedWashRequestIdsByVendor[vendorId] || new Set();
                                            const allSelected = visibleWR.length > 0 && visibleWR.every((wr) => selectedSet.has(wr.id));

                                            return (
                                                <Accordion 
                                                    key={vendorId} 
                                                    disableGutters 
                                                    square={false} 
                                                    sx={{ 
                                                        border: "1px solid", 
                                                        borderColor: "divider", 
                                                        borderRadius: 1, 
                                                        bgcolor: "background.paper", 
                                                        boxShadow: 0, 
                                                        borderLeft: "6px solid #ed6c02",
                                                        "&:before": { display: "none" }, 
                                                        "&:hover": { boxShadow: 1 } 
                                                    }}
                                                >
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", width: "100%", opacity: isEnabled ? 1 : 0.6 }}>
                                                            <Tooltip title={isEnabled ? "Exclude this vendor" : "Include this vendor"}>
                                                                <Checkbox size="small" checked={isEnabled} onChange={() => toggleVendorEnabled(vendorId)} data-agent-field="selected" />
                                                            </Tooltip>
                                                            <Typography sx={{ fontWeight: 700, width: 220, whiteSpace: "normal", wordBreak: "break-word" }}>{vend.name}</Typography>
                                                            <Chip size="small" label={`${visibleWR.length} requests`} color="secondary" variant="outlined" />
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                <TextField value={sequenceByVendor[vendorId] ?? ""} onChange={(e) => setSequenceByVendor(prev => ({ ...prev, [vendorId]: Number(e.target.value) }))} size="small" sx={{ width: 80 }} label="Seq" type="number" inputProps={{ min: 0 }} disabled={!isEnabled} data-agent-field="sequence" />
                                                            </Box>
                                                            <TextField value={visitNotesByVendor[vendorId] || ""} onChange={(e) => setVisitNotesByVendor(prev => ({ ...prev, [vendorId]: e.target.value }))} size="small" placeholder="Visit notes" sx={{ ml: 1, width: 260 }} disabled={!isEnabled} data-agent-field="visitNotes" />
                                                        </Box>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ bgcolor: "background.default", pt: 1 }}>
                                                        {visibleWR.length === 0 ? (
                                                            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>{isEnabled ? "No wash requests. You can still schedule a visit." : "Vendor excluded."}</Typography>
                                                        ) : (
                                                            <Box sx={{ px: 1, pb: 1 }}>
                                                                <Box sx={{ display: "grid", gridTemplateColumns: "80px 180px 120px 180px", gap: 1, position: "sticky", top: 0, zIndex: 1, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider", py: 0.5 }}>
                                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                                                                        <Checkbox size="small" checked={allSelected} onChange={() => toggleAllForVendor(vendorId)} disabled={!isEnabled} />
                                                                        <Typography variant="caption" color="text.secondary">Pick</Typography>
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary">WR Number</Typography>
                                                                    <Typography variant="caption" color="text.secondary">Status</Typography>
                                                                    <Typography variant="caption" color="text.secondary">Date</Typography>
                                                                </Box>
                                                                <Box sx={{ display: "grid", gridAutoRows: "minmax(40px, auto)", mt: 0.5 }}>
                                                                    {visibleWR.map((wr, idx) => (
                                                                         <Box key={wr.id} sx={{ display: "grid", gridTemplateColumns: "80px 180px 120px 180px", gap: 1, alignItems: "center", py: 0.75, borderRadius: 1, ...(idx % 2 === 1 ? { bgcolor: "action.hover" } : {}), "&:hover": { bgcolor: "action.selected" } }}>
                                                                             <Box sx={{ display: "flex", justifyContent: "center" }}>
                                                                                 <Checkbox size="small" checked={selectedSet.has(wr.id)} onChange={() => toggleWashRequestSelection(vendorId, wr.id)} disabled={!isEnabled} />
                                                                             </Box>
                                                                             <Typography sx={{ fontWeight: 500 }}>{wr.requestNumber || wr.id}</Typography>
                                                                             <Typography>{wr.status || "-"}</Typography>
                                                                             <Typography>{wr.createdDate ? new Date(wr.createdDate).toLocaleString() : (wr.washRequestRecordedDate || "-")}</Typography>
                                                                         </Box>
                                                                    ))}
                                                                </Box>
                                                            </Box>
                                                        )}
                                                    </AccordionDetails>
                                                </Accordion>
                                            );
                                        })}
                                    </Box>
                                )}

                                {selectedRoute && washRequests.length === 0 && (
                                    <Box sx={{ p: 3, border: "1px dashed", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No wash requests found for the selected date. You can still schedule vendor visits.
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
            </DialogContent>

            {/* STICKY SUMMARY BAR */}
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
                        label={`Customers: ${enabledCustomers.size}`}
                        size="small"
                    />
                    <Chip
                        color="secondary"
                        variant="outlined"
                        label={`Vendors: ${enabledVendors.size}`}
                        size="small"
                    />
                    <Chip
                        color="primary"
                        variant="outlined"
                        label={`Orders: ${selectedOrdersCount}`}
                        size="small"
                    />
                    <Chip
                        color="secondary"
                        variant="outlined"
                        label={`Wash Req: ${selectedWashRequestsCount}`}
                        size="small"
                    />
                    <Chip
                        color={isCustomerTrip ? "primary" : "secondary"}
                        variant="outlined"
                        label={`Trip Type: ${resolvedTripType}`}
                        size="small"
                    />
                    {selectedDriverIds && selectedDriverIds.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selectedDriverIds.map((uid) => {
                                const user = drivers.find((d) => d.id === uid);
                                const role = rolesByUserId[uid] || 'DRIVER';
                                return (
                                    <Chip key={uid} label={`${user?.name || uid} — ${role}`} size="small" />
                                );
                            })}
                        </Box>
                    )}
                    {vehicle && (
                        <Chip
                            label={`Vehicle: ${vehicle.vehicleNumber}${vehicle.type ? ` — ${vehicle.type}` : ""
                                }`}
                            size="small"
                        />
                    )}
                </Box>

                <Button onClick={resetStateAndClose} color="secondary">
                    Cancel
                </Button>
                <Tooltip title={(!selectedRoute || !deliveryDate || !vehicle || !selectedDriverIds || selectedDriverIds.length === 0) ? "Route, Delivery Date, at least one Delivery Team member, and Vehicle are required" : ""}>
                    <span>
                        <Button onClick={handleCreate} variant="contained">
                            Create Trip
                        </Button>
                    </span>
                </Tooltip>
            </DialogActions>
        </Dialog>
    );
}