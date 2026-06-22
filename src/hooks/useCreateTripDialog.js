import { useEffect, useMemo, useState, useCallback } from "react";
import { tripService } from "../services/tripService";
import { userService } from "../services/userService";
import { inventoryService } from "../services/inventoryService";
import { useDcid } from "../context/DcidContext";

const ORDER_TRIP = "ORDER_TRIP";
const WASH_TRIP = "WASH_TRIP";

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

export default function useCreateTripDialog({
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
    const [tripType, setTripType] = useState(ORDER_TRIP);
    const isCustomerTrip = tripType === ORDER_TRIP;

    useEffect(() => {
        // When route changes, clear selection; we'll enable only customers that have orders after fetch
        if (!selectedRoute) {
            setEnabledCustomers(new Set());
        }
    }, [selectedRoute]);

    const handleTripTypeChange = useCallback((newType) => {
        setTripType(newType);
        if (newType === ORDER_TRIP) {
            setEnabledVendors(new Set());
            setSelectedWashRequestIdsByVendor({});
        } else {
            setEnabledCustomers(new Set());
            setSelectedOrderIdsByCustomer({});
        }
    }, []);

    const validateCustomerTrip = useCallback(() => {
        if (tripType !== ORDER_TRIP) {
            throw new Error("Invalid operation: Must be a Customer Trip to modify customer selections.");
        }
    }, [tripType]);

    const validateWashTrip = useCallback(() => {
        if (tripType !== WASH_TRIP) {
            throw new Error("Invalid operation: Must be a Laundry Trip to modify vendor/wash request selections.");
        }
    }, [tripType]);


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
                    let seq = 1;
                    customers.forEach((c) => {
                        const cid = Number(c.id);
                        if (groupedO[cid]) {
                            next[cid] = seq++;
                        }
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
                
                const vendorIdsWithTasks = Object.keys(groupedW).map(Number);
                setEnabledVendors(new Set(vendorIdsWithTasks));

                setSequenceByVendor((prev) => {
                    const next = { ...prev };
                    let seq = 1;
                    vendors.forEach((v) => {
                        const vid = Number(v.id);
                        if (groupedW[vid]) {
                            next[vid] = seq++;
                        }
                    });
                    return next;
                });

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

    // Grouped for lookup
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

    // Customers with visits, sorted by sequence number
    const customersWithOrders = useMemo(() => {
        return customers
            .filter((c) => (groupedOrdersByCustomer[c.id] || []).length > 0)
            .sort((a, b) => {
                const seqA = sequenceByCustomer[Number(a.id)] ?? Number.MAX_SAFE_INTEGER;
                const seqB = sequenceByCustomer[Number(b.id)] ?? Number.MAX_SAFE_INTEGER;
                return seqA - seqB;
            });
    }, [customers, groupedOrdersByCustomer, sequenceByCustomer]);

    const vendorsWithWashRequests = useMemo(() => {
        return vendors
            .filter((v) => (groupedWashRequestsByVendor[v.id] || []).length > 0)
            .sort((a, b) => {
                const seqA = sequenceByVendor[Number(a.id)] ?? Number.MAX_SAFE_INTEGER;
                const seqB = sequenceByVendor[Number(b.id)] ?? Number.MAX_SAFE_INTEGER;
                return seqA - seqB;
            });
    }, [vendors, groupedWashRequestsByVendor, sequenceByVendor]);

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

    // Customer enabling and selection syncing
    const toggleCustomerEnabled = useCallback((customerId) => {
        validateCustomerTrip();
        setEnabledCustomers((prev) => {
            const next = new Set(prev);
            const isCurrentlyEnabled = next.has(customerId);
            if (isCurrentlyEnabled) {
                next.delete(customerId);
                // Clear all selected orders for this customer
                setSelectedOrderIdsByCustomer((prevSel) => ({
                    ...prevSel,
                    [customerId]: new Set(),
                }));
            } else {
                next.add(customerId);
                // Select all orders for this customer
                setSelectedOrderIdsByCustomer((prevSel) => ({
                    ...prevSel,
                    [customerId]: new Set((filteredGroupedOrdersByCustomer[customerId] || []).map((o) => o.id)),
                }));
            }
            return next;
        });
    }, [validateCustomerTrip, filteredGroupedOrdersByCustomer]);

    // Toggle a single order
    const toggleOrderSelection = useCallback((customerId, orderId) => {
        validateCustomerTrip();
        setSelectedOrderIdsByCustomer((prev) => {
            const pid = customerId;
            const set = new Set(prev[pid] || []);
            if (set.has(orderId)) set.delete(orderId);
            else set.add(orderId);
            
            // Sync enabled state based on selected count
            setEnabledCustomers((prevEnabled) => {
                const next = new Set(prevEnabled);
                if (set.size > 0) {
                    next.add(customerId);
                } else {
                    next.delete(customerId);
                }
                return next;
            });
            
            return { ...prev, [pid]: set };
        });
    }, [validateCustomerTrip]);

    // Move Customer up in sequence
    const moveCustomerUp = useCallback((customerId) => {
        const idx = customersWithOrders.findIndex((c) => Number(c.id) === customerId);
        if (idx <= 0) return;
        const prevCustomer = customersWithOrders[idx - 1];
        const prevCustomerId = Number(prevCustomer.id);
        
        setSequenceByCustomer((prev) => {
            const currentSeq = prev[customerId] ?? (idx + 1);
            const prevSeq = prev[prevCustomerId] ?? idx;
            return {
                ...prev,
                [customerId]: prevSeq,
                [prevCustomerId]: currentSeq
            };
        });
    }, [customersWithOrders]);

    // Move Customer down in sequence
    const moveCustomerDown = useCallback((customerId) => {
        const idx = customersWithOrders.findIndex((c) => Number(c.id) === customerId);
        if (idx === -1 || idx >= customersWithOrders.length - 1) return;
        const nextCustomer = customersWithOrders[idx + 1];
        const nextCustomerId = Number(nextCustomer.id);
        
        setSequenceByCustomer((prev) => {
            const currentSeq = prev[customerId] ?? (idx + 1);
            const nextSeq = prev[nextCustomerId] ?? (idx + 2);
            return {
                ...prev,
                [customerId]: nextSeq,
                [nextCustomerId]: currentSeq
            };
        });
    }, [customersWithOrders]);

    // Drop Customer to reorder sequence
    const handleCustomerDrop = useCallback((draggedId, targetId) => {
        const draggedIdx = customersWithOrders.findIndex((c) => Number(c.id) === draggedId);
        const targetIdx = customersWithOrders.findIndex((c) => Number(c.id) === targetId);
        if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return;
        
        const newOrder = [...customersWithOrders];
        const [removed] = newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, removed);
        
        setSequenceByCustomer((prev) => {
            const next = { ...prev };
            newOrder.forEach((c, idx) => {
                next[Number(c.id)] = idx + 1;
            });
            return next;
        });
    }, [customersWithOrders]);

    // Move Vendor up in sequence
    const moveVendorUp = useCallback((vendorId) => {
        const idx = vendorsWithWashRequests.findIndex((v) => Number(v.id) === vendorId);
        if (idx <= 0) return;
        const prevVendor = vendorsWithWashRequests[idx - 1];
        const prevVendorId = Number(prevVendor.id);
        
        setSequenceByVendor((prev) => {
            const currentSeq = prev[vendorId] ?? (idx + 1);
            const prevSeq = prev[prevVendorId] ?? idx;
            return {
                ...prev,
                [vendorId]: prevSeq,
                [prevVendorId]: currentSeq
            };
        });
    }, [vendorsWithWashRequests]);

    // Move Vendor down in sequence
    const moveVendorDown = useCallback((vendorId) => {
        const idx = vendorsWithWashRequests.findIndex((v) => Number(v.id) === vendorId);
        if (idx === -1 || idx >= vendorsWithWashRequests.length - 1) return;
        const nextVendor = vendorsWithWashRequests[idx + 1];
        const nextVendorId = Number(nextVendor.id);
        
        setSequenceByVendor((prev) => {
            const currentSeq = prev[vendorId] ?? (idx + 1);
            const nextSeq = prev[nextVendorId] ?? (idx + 2);
            return {
                ...prev,
                [vendorId]: nextSeq,
                [nextVendorId]: currentSeq
            };
        });
    }, [vendorsWithWashRequests]);

    // Drop Vendor to reorder sequence
    const handleVendorDrop = useCallback((draggedId, targetId) => {
        const draggedIdx = vendorsWithWashRequests.findIndex((v) => Number(v.id) === draggedId);
        const targetIdx = vendorsWithWashRequests.findIndex((v) => Number(v.id) === targetId);
        if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return;
        
        const newOrder = [...vendorsWithWashRequests];
        const [removed] = newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, removed);
        
        setSequenceByVendor((prev) => {
            const next = { ...prev };
            newOrder.forEach((v, idx) => {
                next[Number(v.id)] = idx + 1;
            });
            return next;
        });
    }, [vendorsWithWashRequests]);

    // Wash Request toggles
    const toggleVendorEnabled = useCallback((vendorId) => {
        validateWashTrip();
        setEnabledVendors((prev) => {
            const next = new Set(prev);
            const isCurrentlyEnabled = next.has(vendorId);
            if (isCurrentlyEnabled) {
                next.delete(vendorId);
                // Clear all selected wash requests for this vendor
                setSelectedWashRequestIdsByVendor((prevSel) => ({
                    ...prevSel,
                    [vendorId]: new Set(),
                }));
            } else {
                next.add(vendorId);
                // Select all wash requests for this vendor
                setSelectedWashRequestIdsByVendor((prevSel) => ({
                    ...prevSel,
                    [vendorId]: new Set((groupedWashRequestsByVendor[vendorId] || []).map((w) => w.id)),
                }));
            }
            return next;
        });
    }, [validateWashTrip, groupedWashRequestsByVendor]);

    const toggleWashRequestSelection = useCallback((vendorId, wrId) => {
        validateWashTrip();
        setSelectedWashRequestIdsByVendor((prev) => {
            const pid = vendorId;
            const set = new Set(prev[pid] || []);
            
            const clickedWr = washRequests.find(w => w.id === wrId);
            const isRewash = clickedWr?.washRequestType === "RE_WASH";
            
            if (isRewash) {
                if (set.has(wrId)) set.delete(wrId);
                else set.add(wrId);
            } else {
                const visible = groupedWashRequestsByVendor[vendorId] || [];
                const regularWashes = visible.filter(w => w.washRequestType !== "RE_WASH");
                
                const isCurrentlySelected = set.has(wrId);
                if (isCurrentlySelected) {
                    regularWashes.forEach(w => set.delete(w.id));
                } else {
                    regularWashes.forEach(w => set.add(w.id));
                }
            }
            
            // Sync enabled state based on selected count
            setEnabledVendors((prevEnabled) => {
                const next = new Set(prevEnabled);
                if (set.size > 0) {
                    next.add(vendorId);
                } else {
                    next.delete(vendorId);
                }
                return next;
            });
            
            return { ...prev, [pid]: set };
        });
    }, [validateWashTrip, washRequests, groupedWashRequestsByVendor]);

    const handleCreate = async () => {
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
                tripType,
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
        setTripType(ORDER_TRIP);
        setSubmitAttempted(false);
        onClose?.();
    };

    return {
        isCustomerTrip,
        tripType,
        handleTripTypeChange,
        dcid,
        warehouses,
        selectedRoute,
        routes,
        setSelectedRoute,
        submitAttempted,
        deliveryDate,
        setDeliveryDate,
        drivers,
        selectedDriverIds,
        setSelectedDriverIds,
        rolesByUserId,
        setRolesByUserId,
        vehicle,
        setVehicle,
        vehicles,
        notes,
        setNotes,
        customers,
        vendors,
        enabledCustomers,
        enabledVendors,
        selectedOrdersCount,
        selectedWashRequestsCount,
        orders,
        washRequests,
        loadingOrders,
        loadingWashRequests,
        ordersError,
        toggleCustomerEnabled,
        toggleOrderSelection,
        toggleVendorEnabled,
        toggleWashRequestSelection,
        handleCreate,
        resetStateAndClose,
        customersWithOrders,
        vendorsWithWashRequests,
        filteredGroupedOrdersByCustomer,
        groupedWashRequestsByVendor,
        selectedOrderIdsByCustomer,
        selectedWashRequestIdsByVendor,
        visitNotesByCustomer,
        setVisitNotesByCustomer,
        visitNotesByVendor,
        setVisitNotesByVendor,
        sequenceByCustomer,
        setSequenceByCustomer,
        sequenceByVendor,
        setSequenceByVendor,
        moveCustomerUp,
        moveCustomerDown,
        handleCustomerDrop,
        moveVendorUp,
        moveVendorDown,
        handleVendorDrop,
    };
}
