import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  ListSubheader,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import tripService from "../../services/tripService";
import { customerService } from "../../services/customerService";
import { laundryVendorService } from "../../services/laundryVendorService";
import { orderService } from "../../services/orderService";
import { debounce } from "lodash";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Info as InfoIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { productService } from "../../services/productService";
import VisitImagesDialog from "./VisitImagesDialog";
import { userService } from "../../services/userService";
import { DATE_TIME, formatCustomDate } from "../../utils/dateUtils";
import CustomSnackbar from "../layout/CustomSnackbar";
import { GlobalStyles } from "@mui/material";
import TableCell from "../common/TableCell";
import CustomDrawer from "../common/CustomDrawer";
import CompleteDeliveryDialog from "./CompleteDeliveryDialog";
import CompletePickupDialog from "./CompletePickupDialog";
import VisitLevelChallanDialog from "./VisitLevelChallanDialog";

const getInventoryItemRefs = (productItem) => {
  const itemEntries = Array.isArray(productItem?.items) ? productItem.items : [];
  return itemEntries
    .map((entry) => entry?.inventoryItemId ?? entry?.referenceId ?? entry?.id)
    .filter((value) => value !== null && value !== undefined);
};

const getInventoryItemRefsByCondition = (productItem, conditionType) => {
  const itemEntries = Array.isArray(productItem?.items) ? productItem.items : [];
  return itemEntries
    .filter((entry) => entry?.conditionType === conditionType)
    .map((entry) => entry?.inventoryItemId ?? entry?.referenceId ?? entry?.id)
    .filter((value) => value !== null && value !== undefined);
};

const getActualPickupItemRefs = (expectedItem) => {
  const items = Array.isArray(expectedItem?.actualPickupItems) ? expectedItem.actualPickupItems : [];
  return items
    .map((entry) => entry?.referenceId ?? entry?.id)
    .filter((value) => value !== null && value !== undefined);
};

const getTripChallanImageUrls = (visits = [], getVisitExistingChallan) =>
  visits
    .map((visit) => {
      const challan = getVisitExistingChallan(visit);
      if (!challan?.challanUrl) {
        return null;
      }

      return {
        src: challan.challanUrl,
        title: visit?.partyName || visit?.customerName || visit?.vendorName || "",
        subtitle: challan?.challanNumber ? `DC: ${challan.challanNumber}` : "",
      };
    })
    .filter(Boolean);

function TripDetailsSidebar({
  open,
  onClose,
  tripDetails,
  fetchTrips,
  onTripUpdate,
}) {
  const [openAddVisitDialog, setOpenAddVisitDialog] = useState(false);
  const [openCompleteVisitDialog, setOpenCompleteVisitDialog] = useState(false);
  const [partyType, setPartyType] = useState(tripDetails?.tripType === "ORDER_TRIP" ? "CUSTOMER" : "LAUNDRY_VENDOR");
  const [parties, setParties] = useState([]);

  useEffect(() => {
    if (tripDetails) {
      setPartyType(tripDetails.tripType === "ORDER_TRIP" ? "CUSTOMER" : "LAUNDRY_VENDOR");
    }
  }, [tripDetails]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [loadingParties, setLoadingParties] = useState(false);
  const [orders, setOrders] = useState([]);
  const [visitItems, setVisitItems] = useState([]);
  const [plannedTime, setPlannedTime] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [sequenceNumber, setSequenceNumber] = useState("");
  const [completionDate, setCompletionDate] = useState(new Date());
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [openReconciliationDialog, setOpenReconciliationDialog] =
    useState(false);
  const [selectedVisitOrderRequestId, _setSelectedVisitOrderRequestId] =
    useState(null);
  const [itemType, setItemType] = useState("");
  const [productId, setProductId] = useState("");
  const [expectedQuantity, setExpectedQuantity] = useState("");
  const [actualQuantity, setActualQuantity] = useState("");
  const [heavySoiledQuantity, setHeavySoiledQuantity] = useState("");
  const [damagedQuantity, setDamagedQuantity] = useState("");

  const [products, setProducts] = useState([]);

  // Delivery dialog state
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [selectedDeliveryRequest, setSelectedDeliveryRequest] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Pickup dialog state
  const [openPickupCompleteDialog, setOpenPickupCompleteDialog] =
    useState(false);
  const [selectedPickupRequest, setSelectedPickupRequest] = useState(null);

  const [isReconciling, setIsReconciling] = useState(false);

  const [editingVisit, setEditingVisit] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Assign drivers/vehicle dialog state
  const [openAssignDriver, setOpenAssignDriver] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState([]);
  const [rolesByUserId, setRolesByUserId] = useState({});
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [uploadingRequestId, setUploadingRequestId] = useState(null);
  const [visitChallanNumbers, setVisitChallanNumbers] = useState({});
  const [visitChallanDialogVisit, setVisitChallanDialogVisit] = useState(null);
  const [openUpdateChallanDialog, setOpenUpdateChallanDialog] = useState(false);
  const [challanDialogVisit, setChallanDialogVisit] = useState(null);
  const [newChallanNumberVal, setNewChallanNumberVal] = useState("");
  const [isUpdatingChallan, setIsUpdatingChallan] = useState(false);

  const closeVisitChallanDialog = () => {
    setVisitChallanNumbers({});
    setVisitChallanDialogVisit(null);
    setUploadingRequestId(null);
  };


  const fetchTripDetails = async () => {
    try {
      const updatedDetails = await tripService.getTripDetails(tripDetails.id);
      tripDetails.visits = updatedDetails.visits;
      tripDetails.notes = updatedDetails.notes;
      tripDetails.status = updatedDetails.status;
      tripDetails.driverName = updatedDetails.driverName;
      tripDetails.driverId = updatedDetails.driverId;
      if (Array.isArray(updatedDetails.assignedPeople)) {
        tripDetails.assignedPeople = updatedDetails.assignedPeople;
      }
      tripDetails.vehicleNumber = updatedDetails.vehicleNumber;
      tripDetails.vehicleName = updatedDetails.vehicleName;
      if (updatedDetails.vehicleId)
        tripDetails.vehicleId = updatedDetails.vehicleId;
      tripDetails.referenceNumber = updatedDetails.referenceNumber;
      tripDetails.plannedDate = updatedDetails.plannedDate;
      tripDetails.completedAt = updatedDetails.completedAt;
      tripDetails.startedAt = updatedDetails.startedAt;

      setSelectedVisitId(null);
    } catch (err) {
      console.error("Error refreshing trip details after visit update:", err);
    }
  };

  // Load drivers and vehicles when opening assign dialog
  useEffect(() => {
    const loadLists = async () => {
      try {
        const branchId = localStorage.getItem("branchId");
        const [dList, vList] = await Promise.all([
          userService.getActiveUsers(branchId),
          tripService.getVehiclesByBranch(branchId),
        ]);
        setDrivers(Array.isArray(dList) ? dList : []);
        setVehicles(Array.isArray(vList) ? vList : []);

        if (
          Array.isArray(tripDetails?.assignedPeople) &&
          tripDetails.assignedPeople.length > 0
        ) {
          const ids = tripDetails.assignedPeople
            .map((p) => (typeof p === "object" ? p.userId : p))
            .filter(Boolean);
          setSelectedDriverIds(ids);
          const map = {};
          tripDetails.assignedPeople.forEach((p, idx) => {
            const uid = typeof p === "object" ? p.userId : p;
            const role =
              typeof p === "object" && p.role
                ? p.role
                : idx === 0
                  ? "DRIVER"
                  : "HELPER";
            if (uid) map[uid] = role;
          });
          setRolesByUserId(map);
        } else {
          const single = tripDetails?.driverId ? [tripDetails.driverId] : [];
          setSelectedDriverIds(single);
          if (single.length > 0) setRolesByUserId({ [single[0]]: "DRIVER" });
        }

        if (tripDetails?.vehicleId) {
          setSelectedVehicleId(tripDetails.vehicleId);
        } else if (tripDetails?.vehicleNumber) {
          const match = (Array.isArray(vList) ? vList : []).find(
            (v) => v.vehicleNumber === tripDetails.vehicleNumber,
          );
          setSelectedVehicleId(match?.id || "");
        } else {
          setSelectedVehicleId("");
        }
      } catch (e) {
        console.error("Failed to load drivers/vehicles", e);
      }
    };
    if (openAssignDriver) {
      loadLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAssignDriver]);

  const handleAssignDriver = async () => {
    try {
      const assignedPeople = (selectedDriverIds || []).map((uid, idx) => ({
        userId: uid,
        role: rolesByUserId[uid] || (idx === 0 ? "DRIVER" : "HELPER"),
      }));
      const payload = {
        assignedPeople,
        vehicleId: selectedVehicleId || null,
      };
      await tripService.assignDriverAndVehicle(tripDetails.id, payload);
      setOpenAssignDriver(false);
      await fetchTripDetails();
      if (typeof fetchTrips === "function") fetchTrips();
    } catch (error) {
      console.error("Failed to assign driver/vehicle", error);
      showSnackbar(
        error?.response?.data?.message ||
        "Failed to assign drivers and vehicle. Please try again.",
        "error",
      );
    }
  };

  const fetchParties = async (searchTerm) => {
    setLoadingParties(true);
    try {
      let data = [];
      if (partyType === "CUSTOMER") {
        data = await customerService.searchCustomersByName(searchTerm);
      } else {
        const all = await laundryVendorService.getAllVendors();
        data = Array.isArray(all) ? all : (all?.content || []);
        if (searchTerm) {
          data = data.filter(v => (v.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
        }
      }
      setParties(data);
    } catch (error) {
      console.error("Error fetching parties:", error);
    } finally {
      setLoadingParties(false);
    }
  };

  const debouncedFetchParties = debounce(fetchParties, 300);

  const handlePartyInputChange = (event, value) => {
    if (value) {
      debouncedFetchParties(value);
    } else {
      setParties([]);
    }
  };

  const handleAddItem = () => {
    setVisitItems([
      ...visitItems,
      { orderId: "", deliveryType: "", remarks: "" },
    ]);
  };

  const handleRemoveItem = (index) => {
    setVisitItems(visitItems.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const updatedItems = [...visitItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setVisitItems(updatedItems);
  };

  const handleAddVisit = async () => {
    if (!selectedParty) {
      showSnackbar("Please select a party", "error");
      return;
    }
    const visitData = {
      tripId: tripDetails.id,
      partyId: selectedParty.id,
      partyType: partyType,
      plannedTime: plannedTime,
      visitFlowType: "UNTAGGED",
      visitRequests: visitItems.flatMap((it, idx) => {
        if (it.deliveryType === "BOTH") {
          return [
            { referenceId: it.orderId, referenceType: "ORDER", deliveryType: "DELIVERY", sequence: idx * 2 + 1, notes: it.remarks },
            { referenceId: it.orderId, referenceType: "ORDER", deliveryType: "PICKUP", sequence: idx * 2 + 2, notes: it.remarks }
          ];
        }
        return [{
          referenceId: it.orderId,
          referenceType: "ORDER",
          deliveryType: it.deliveryType || "DELIVERY",
          sequence: idx + 1,
          notes: it.remarks
        }];
      }),
      notes,
      sequence: Number(sequenceNumber) || 0,
    };
    try {
      await tripService.addVisit(visitData);
      setOpenAddVisitDialog(false);
      setSelectedParty(null);
      setVisitItems([]);
      setNotes("");
      setSequenceNumber("");
      fetchTrips();
      showSnackbar("Visit added successfully!", "success");
    } catch (err) {
      showSnackbar(err.response?.data?.message || "Failed to add visit", "error");
    }
  };

  const handleCompleteVisitSubmit = async () => {
    if (!selectedVisitId) {
      showSnackbar("No visit selected.", "error");
      return;
    }

    try {
      await tripService.completeVisit(selectedVisitId, {
        completionDateTime: completionDate,
      });
      showSnackbar("Visit completed successfully!", "success");
      setOpenCompleteVisitDialog(false);
      fetchTrips();
    } catch (error) {
      console.error("Error completing visit:", error);
      showSnackbar("Failed to complete visit.", "error");
    }
  };

  const fetchIncompleteOrders = async (customerId) => {
    try {
      const orderData = await orderService.getIncompleteOrders(customerId);
      setOrders(orderData);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  const getChipColor = (status) => {
    const s = (status || "").toString().toUpperCase();
    if (s === "COMPLETED") return "success";
    if (s === "IN_PROGRESS") return "info";
    if (s === "PENDING") return "warning";
    if (s === "CANCELLED") return "error";
    return "default";
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productService.getProducts();
        setProducts(response);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  const handleReconciliationSubmit = async () => {
    if (!selectedVisitOrderRequestId || !selectedVisitId) {
      showSnackbar("No order or visit selected.", "error");
      return;
    }

    try {
      await tripService.addReconciliation(
        selectedVisitId,
        selectedVisitOrderRequestId,
        {
          itemType,
          productId,
          expectedQuantity,
          actualQuantity,
          heavySoiledQuantity,
          damagedQuantity,
        },
      );
      showSnackbar("Reconciliation added successfully!", "success");
      setOpenReconciliationDialog(false);
    } catch (error) {
      console.error("Error adding reconciliation:", error);
      showSnackbar("Failed to add reconciliation.", "error");
    }
  };

  const handleCompleteClick = (deliveryRequest, visitId, tripId) => {
    setSelectedDeliveryRequest(deliveryRequest);
    setSelectedVisitId(visitId);
    setSelectedTripId(tripId);
    setOpenCompleteDialog(true);
  };

  const handlePickupCompleteClick = (pickupRequest, visitId, tripId) => {
    setSelectedPickupRequest(pickupRequest);
    setSelectedVisitId(visitId);
    setSelectedTripId(tripId);
    setNotes("");
    setCompletionDate(new Date());
    setOpenPickupCompleteDialog(true);
  };

  const getVisitExistingChallan = (visit) => {
    if (!visit) return null;

    const deliveryMatch = (visit.deliveryRequests || []).find(
      (request) => request?.challanUrl || request?.challanNumber
    );
    if (deliveryMatch) return deliveryMatch;

    return (
      (visit.pickupRequests || []).find(
        (request) => request?.challanUrl || request?.challanNumber
      ) || null
    );
  };

  const handleVisitLevelChallanUpload = async ({ visit, file }) => {
    if (!file) return;

    const challanNumber = visitChallanNumbers[visit.id] || "";

    if (!challanNumber.trim()) {
      showSnackbar("Please enter delivery challan number before upload.", "error");
      return;
    }

    try {
      setUploadingRequestId(visit.id);
      await tripService.uploadDeliveryChallanWithNumber(
        visit.id,
        file,
        challanNumber.trim()
      );
      showSnackbar("Visit challan uploaded successfully!", "success");
      setVisitChallanNumbers((prev) => ({
        ...prev,
        [visit.id]: "",
      }));
      setVisitChallanDialogVisit(null);
      await fetchTripDetails();
    } catch (error) {
      console.error("Failed to upload visit-level challan", error);
      showSnackbar(
        error?.message || "Failed to upload visit challan.",
        "error"
      );
    } finally {
      setUploadingRequestId(null);
    }
  };

  const openVisitChallanDialog = (visit) => {
    setVisitChallanDialogVisit(visit);
  };

  const handleVisitChallanNumberChange = (value) => {
    if (!visitChallanDialogVisit) return;

    setVisitChallanNumbers((prev) => ({
      ...prev,
      [visitChallanDialogVisit.id]: value,
    }));
  };

  const handleVisitChallanSubmit = async (file) => {
    if (!visitChallanDialogVisit) return;

    await handleVisitLevelChallanUpload({
      visit: visitChallanDialogVisit,
      file,
    });
  };

  const visitChallanDialogNumber = visitChallanDialogVisit
    ? visitChallanNumbers[visitChallanDialogVisit.id] ?? ""
    : "";

  const isVisitChallanSubmitting =
    Boolean(visitChallanDialogVisit) &&
    uploadingRequestId === visitChallanDialogVisit?.id;

  const handleOpenUpdateChallan = (visit) => {
    const existing = getVisitExistingChallan(visit);
    if (!existing) return;
    setChallanDialogVisit(visit);
    setNewChallanNumberVal(existing.challanNumber || "");
    setOpenUpdateChallanDialog(true);
  };

  const handleUpdateChallanSubmit = async () => {
    if (!challanDialogVisit) return;
    const existing = getVisitExistingChallan(challanDialogVisit);
    if (!existing) return;

    const oldChallan = existing.challanNumber;
    const newChallan = newChallanNumberVal.trim();

    if (!newChallan) {
      showSnackbar("New challan number is required", "error");
      return;
    }

    if (oldChallan === newChallan) {
      showSnackbar("New challan number must be different from the old one", "error");
      return;
    }

    try {
      setIsUpdatingChallan(true);
      await tripService.updateDeliveryChallanNumber(challanDialogVisit.id, {
        oldChallanNumber: oldChallan,
        newChallanNumber: newChallan
      });
      showSnackbar("Challan number updated successfully!", "success");
      setOpenUpdateChallanDialog(false);
      setChallanDialogVisit(null);
      await fetchTripDetails();
      if (typeof fetchTrips === "function") fetchTrips();
    } catch (error) {
      console.error("Failed to update challan number:", error);
      showSnackbar(error.message || "Failed to update challan number.", "error");
    } finally {
      setIsUpdatingChallan(false);
    }
  };

  const handleDeleteChallan = async (visit) => {
    const existing = getVisitExistingChallan(visit);
    if (!existing || !existing.challanNumber) return;

    if (!window.confirm(`Are you sure you want to remove delivery challan "${existing.challanNumber}" from this visit?`)) {
      return;
    }

    try {
      await tripService.removeDeliveryChallanFromVisit(visit.id, existing.challanNumber);
      showSnackbar("Challan removed successfully!", "success");
      await fetchTripDetails();
      if (typeof fetchTrips === "function") fetchTrips();
    } catch (error) {
      console.error("Failed to remove challan:", error);
      showSnackbar(error.message || "Failed to remove challan.", "error");
    }
  };

  const tripChallanImageUrls = getTripChallanImageUrls(
    tripDetails?.visits,
    getVisitExistingChallan
  );

  const handleReconcile = async () => {
    if (!tripDetails?.id) return;
    if (!window.confirm("Are you sure you want to reconcile this trip?"))
      return;
    try {
      setIsReconciling(true);
      const response = await tripService.reconcileTrip(tripDetails.id);
      const updateTripDetails = {
        ...tripDetails,
        reconciliationStatus: "RECONCILED",
      };
      showSnackbar(response?.message, "success");
      if (onTripUpdate) {
        onTripUpdate(updateTripDetails);
      } else if (fetchTrips) {
        fetchTrips();
      }
    } catch (error) {
      console.error("Failed to reconcile trip:", error);
      showSnackbar(
        "Failed to reconcile trip: " + (error.message || "Unknown error"),
        "error",
      );
    } finally {
      setIsReconciling(false);
    }
  };

  const handleMarkTripCompleted = async () => {
    if (!tripDetails?.id) return;
    try {
      const completedDate = new Date().toISOString();
      await tripService.completeTrip(tripDetails.id, completedDate);
      showSnackbar("Trip marked as completed!", "success");
      if (fetchTrips) fetchTrips();
    } catch (error) {
      console.error("Failed to mark trip completed:", error);
      showSnackbar(
        error?.response?.data?.message ||
        "Failed to mark trip completed. Please try again.",
        "error",
      );
    }
  };



  return (
    <CustomDrawer
      open={open}
      onClose={onClose}
      width={750}
    >
      <Box sx={{ padding: 2, position: "relative", minHeight: "100vh" }}>
        {/* Reconcile overlay */}
        {isReconciling && (
          <>
            <GlobalStyles
              styles={{
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            />
            <Box
              sx={{
                position: "fixed",
                top: 0,
                right: 0,
                width: 750,
                height: "100vh",
                bgcolor: "rgba(255,255,255,0.85)",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                component="img"
                src="/linen.png"
                alt="Reconciling..."
                sx={{
                  width: 52,
                  height: 52,
                  animation: "spin 1.2s linear infinite",
                  filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.16))",
                  objectFit: "contain",
                  mb: 2,
                  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
                Reconciling trip...
              </Typography>
            </Box>
          </>
        )}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          Trip Details
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {tripDetails && tripDetails.visits ? (
          <>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Name:</strong> {tripDetails.tripName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Planned Date:</strong>{" "}
                {formatCustomDate(tripDetails.plannedDate)}
              </Typography>
              <Box
                sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
              >
                <Typography variant="body2">
                  <strong>Status:</strong>
                </Typography>
                <Chip
                  label={tripDetails.status}
                  size="small"
                  color={getChipColor(tripDetails.status)}
                />
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Reference Number:</strong> {tripDetails.referenceNumber}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1}}>
                <strong>Visits Count:</strong> {tripDetails.visits.length}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 1, mb: tripChallanImageUrls.length > 0 ? 0.25 : 1 }}
              >
                <strong>Notes:</strong> {tripDetails.notes}
              </Typography>
              {tripChallanImageUrls.length > 0 && (
                <Box
                  sx={{
                    mt: 0,
                    mb: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2">
                    <strong>Trip Delivery Challans:</strong>
                  </Typography>
                  <VisitImagesDialog
                    imageUrls={tripChallanImageUrls}
                    title="Trip Delivery Challans"
                  />
                </Box>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography
                variant="subtitle1"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Delivery Team
              </Typography>
              {Array.isArray(tripDetails.assignedPeople) &&
                tripDetails.assignedPeople.length > 0 ? (
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}
                >
                  {tripDetails.assignedPeople.map((p, idx) => (
                    <Chip
                      key={`${p.userId || idx}`}
                      label={`${p.name || p.userName || p.userId} — ${p.role || (idx === 0 ? "DRIVER" : "HELPER")
                        }`}
                      size="small"
                    />
                  ))}
                </Box>
              ) : (
                <>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Delivery Team Name:</strong>{" "}
                    {tripDetails.driverName}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Delivery Team ID:</strong> {tripDetails.driverId}
                  </Typography>
                </>
              )}
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DriveEtaIcon />}
                  onClick={() => setOpenAssignDriver(true)}
                >
                  {Array.isArray(tripDetails?.assignedPeople) &&
                    tripDetails.assignedPeople.length > 0
                    ? "Change Delivery Team"
                    : tripDetails?.driverId
                      ? "Change Delivery Team"
                      : "Assign Delivery Team"}
                </Button>
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Vehicle Details
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Vehicle Name:</strong> {tripDetails.vehicleName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Vehicle Number:</strong> {tripDetails.vehicleNumber}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Visits
                </Typography>
                {tripDetails.reconciliationStatus != "RECONCILED" && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => setOpenAddVisitDialog(true)}
                    >
                      Add Visit
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      onClick={handleMarkTripCompleted}
                    >
                      Mark Trip Completed
                    </Button>
                  </Box>
                )}
              </Box>
              {tripDetails.visits.map((visit, index) => (
                <Accordion
                  key={visit.id}
                  sx={{
                    backgroundColor: "#f5f5f5",
                    mb: 1,
                    borderLeft: tripDetails.tripType === "WASH_TRIP" ? "6px solid #ed6c02" : "6px solid #1976d2"
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Visit #{index + 1}
                          </Typography>
                          <Chip
                            label={visit.status}
                            size="small"
                            color={getChipColor(visit.status)}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary" }}
                        >
                          {visit.partyName || visit.customerName}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>

                    <Typography variant="body1">
                      <strong>Visit ID:</strong> {visit.id}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Customer/Vendor:</strong> {visit.partyName || visit.customerName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Address:</strong> {visit.address.city},{" "}
                      {visit.address.state}, {visit.address.country}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Remarks:</strong> {visit.visitRemarks}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="body2">
                        <strong>Bag Number:</strong> {visit.notes}
                      </Typography>

                      <Button
                        size="small"
                        color="primary"
                        variant="text"
                        sx={{ ml: 2 }}
                        onClick={() => {
                          setEditingVisit(visit);
                          setEditNotes(visit.notes || "");
                        }}
                      >
                        Edit
                      </Button>
                    </Box>
                      <VisitImagesDialog imageUrls={visit.images || []} />
                    <Box
                      sx={{
                        mt: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {getVisitExistingChallan(visit) && (
                          <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <strong>Challan:</strong>{" "}
                            {getVisitExistingChallan(visit)?.challanNumber || "N/A"}
                            {getVisitExistingChallan(visit)?.challanUrl ? (
                              <>
                                {" — "}
                                <a
                                  href={getVisitExistingChallan(visit)?.challanUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "#1976d2",
                                    textDecoration: "none",
                                    fontWeight: 500,
                                    marginRight: "8px",
                                  }}
                                >
                                  View Document
                                </a>
                              </>
                            ) : null}
                            <Tooltip title="Edit Challan Number">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenUpdateChallan(visit)}
                                sx={{ p: 0.25 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Challan">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteChallan(visit)}
                                sx={{ p: 0.25 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={
                            uploadingRequestId === visit.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <CloudUploadIcon />
                            )
                          }
                          onClick={() => openVisitChallanDialog(visit)}
                        >
                          Scan Delivery Challan
                        </Button>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1 }} />

                    {visit.deliveryRequests &&
                      visit.deliveryRequests.length > 0 && (
                        <>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Delivery Requests
                          </Typography>
                          {visit.deliveryRequests.map(
                            (deliveryRequest, drIdx) => (
                              <Box
                                key={deliveryRequest.id}
                                sx={{ ml: 2, mb: 1 }}
                              >
                                <Typography variant="body2">
                                  <strong>Request #{drIdx + 1}:</strong>
                                </Typography>
                                 <Typography variant="body2">
                                   <strong>Request Number:</strong>{" "}
                                   {deliveryRequest.requestNumber}
                                 </Typography>
                                 {tripDetails.tripType === "WASH_TRIP" &&
                                   deliveryRequest.requestName && (
                                     <Typography variant="body2">
                                       <strong>Request Name:</strong>{" "}
                                       {deliveryRequest.requestName}
                                     </Typography>
                                   )}
                                 <Box
                                   sx={{
                                     display: "flex",
                                     alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography variant="body2">
                                    <strong>Status:</strong>
                                  </Typography>
                                  <Chip
                                    label={deliveryRequest.status}
                                    size="small"
                                    color={getChipColor(deliveryRequest.status)}
                                  />
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 0.5 }}>
                                  <Typography variant="body2">
                                    <strong>Planned:</strong> {formatCustomDate(deliveryRequest.plannedDeliveryTime, DATE_TIME)}
                                  </Typography>
                                  {deliveryRequest.actualDeliveryTime && (
                                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                                      <strong>Actual:</strong> {formatCustomDate(deliveryRequest.actualDeliveryTime, DATE_TIME)}
                                    </Typography>
                                  )}
                                </Box>

                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                    Notes:
                                  </Typography>
                                  <Typography variant="body2" sx={{
                                    whiteSpace: 'pre-wrap',
                                    color: deliveryRequest.notes ? 'text.primary' : 'text.disabled',
                                    pl: 1, borderLeft: '2px solid #eee'
                                  }}>
                                    {deliveryRequest.notes || "--"}
                                  </Typography>
                                </Box>

                                {deliveryRequest.challanUrl && (
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Challan:</strong> {deliveryRequest.challanNumber || "N/A"} — {" "}
                                    <a
                                      href={deliveryRequest.challanUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: "#1976d2", textDecoration: "none", fontWeight: 500 }}
                                    >
                                      View Document
                                    </a>
                                  </Typography>
                                )}
                                <Typography variant="body2">
                                  <strong>Items:</strong>
                                </Typography>

                                <TableContainer
                                  component={Paper}
                                  sx={{ mt: 2 }}
                                >
                                  <Table>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>
                                          <strong>Product Name</strong>
                                        </TableCell>
                                        <TableCell>
                                          <strong>Expected Quantity</strong>
                                        </TableCell>
                                        <TableCell>
                                          <strong>Delivered Quantity</strong>
                                        </TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {deliveryRequest.productItems.map(
                                        (item, idx) => (
                                          <TableRow key={idx}>
                                            <TableCell>
                                              {item.productName}
                                            </TableCell>
                                            <TableCell
                                              variant="scan"
                                              value={item.expectedQuantity}
                                              editable={false}
                                              inventoryItemIds={getInventoryItemRefs(item)}
                                            />
                                            <TableCell>
                                              {item.deliveredQuantity || 0}
                                            </TableCell>
                                          </TableRow>
                                        ),
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                                {tripDetails.reconciliationStatus !==
                                  "RECONCILED" && (
                                    <Button
                                      variant="contained"
                                      color="primary"
                                      sx={{ mt: 1 }}
                                      onClick={() =>
                                        handleCompleteClick(
                                          deliveryRequest,
                                          visit.id,
                                          tripDetails.id,
                                        )
                                      }
                                    >
                                      {deliveryRequest.status === "COMPLETED"
                                        ? "Update"
                                        : "Complete"}
                                    </Button>
                                  )}
                              </Box>
                            ),
                          )}
                        </>
                      )}

                    {visit.pickupRequests &&
                      visit.pickupRequests.length > 0 && (
                        <>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold" }}
                          >
                            Pickup Requests
                          </Typography>
                          {visit.pickupRequests.map((pickupRequest, prIdx) => (
                            <Box key={pickupRequest.id} sx={{ ml: 2, mb: 1 }}>
                              <Typography variant="body2">
                                <strong>Request #{prIdx + 1}:</strong>
                              </Typography>
                              <Typography variant="body2">
                                <strong>Request Number:</strong>{" "}
                                {pickupRequest.requestNumber}
                              </Typography>
                              {tripDetails.tripType === "WASH_TRIP" &&
                                pickupRequest.requestName && (
                                  <Typography variant="body2">
                                    <strong>Request Name:</strong>{" "}
                                    {pickupRequest.requestName}
                                  </Typography>
                                )}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography variant="body2">
                                  <strong>Status:</strong>
                                </Typography>
                                <Chip
                                  label={pickupRequest.status}
                                  size="small"
                                  color={getChipColor(pickupRequest.status)}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 0.5 }}>
                                <Typography variant="body2">
                                  <strong>Planned:</strong> {formatCustomDate(pickupRequest.plannedPickupTime, DATE_TIME)}
                                </Typography>
                                {pickupRequest.actualPickupTime && (
                                  <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                                    <strong>Actual:</strong> {formatCustomDate(pickupRequest.actualPickupTime, DATE_TIME)}
                                  </Typography>
                                )}
                              </Box>

                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                  Notes:
                                </Typography>
                                <Typography variant="body2" sx={{
                                  whiteSpace: 'pre-wrap',
                                  color: pickupRequest.notes ? 'text.primary' : 'text.disabled',
                                  pl: 1, borderLeft: '2px solid #eee'
                                }}>
                                  {pickupRequest.notes || "--"}
                                </Typography>
                              </Box>

                              {pickupRequest.challanUrl && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Challan:</strong> {pickupRequest.challanNumber || "N/A"} — {" "}
                                  <a
                                    href={pickupRequest.challanUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#1976d2", textDecoration: "none", fontWeight: 500 }}
                                  >
                                    View Document
                                  </a>
                                </Typography>
                              )}
                              <Typography variant="body2">
                                <strong>Expected Items:</strong>
                              </Typography>

                              <TableContainer component={Paper} sx={{ mt: 2 }}>
                                <Table>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>
                                        <strong>Product Name</strong>
                                      </TableCell>
                                      <TableCell>
                                        <strong>Expected Quantity</strong>
                                      </TableCell>
                                      <TableCell>
                                        <strong>Actual Quantity</strong>
                                      </TableCell>
                                      <TableCell>
                                        <strong>Heavy Soiled Quantity</strong>
                                      </TableCell>
                                      <TableCell>
                                        <strong>Damaged Quantity</strong>
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {(
                                      pickupRequest.productItems ||
                                      pickupRequest.expectedItems ||
                                      []
                                    ).map(
                                      (item, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell>
                                            {item.productName || item.product?.name}
                                          </TableCell>
                                          <TableCell>
                                            {item.expectedQuantity ?? 0}
                                          </TableCell>
                                          <TableCell
                                            variant="scan"
                                            value={item.pickedUpQuantity ?? item.actualQuantity ?? 0}
                                            editable={false}
                                            inventoryItemIds={getActualPickupItemRefs(item)}
                                          />
                                          <TableCell
                                            variant="scan"
                                            value={item.heavySoiledQuantity ?? 0}
                                            editable={false}
                                            inventoryItemIds={getInventoryItemRefsByCondition(item, "HEAVY_SOILED")}
                                          />
                                          <TableCell
                                            variant="scan"
                                            value={item.damagedQuantity ?? 0}
                                            editable={false}
                                            inventoryItemIds={getInventoryItemRefsByCondition(item, "DAMAGED")}
                                          />
                                        </TableRow>
                                      ),
                                    )}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                              {tripDetails.reconciliationStatus !==
                                "RECONCILED" && (
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    sx={{ mt: 1 }}
                                    onClick={() =>
                                      handlePickupCompleteClick(
                                        pickupRequest,
                                        visit.id,
                                        tripDetails.id,
                                      )
                                    }
                                  >
                                    {pickupRequest.status === "COMPLETED"
                                      ? "Update"
                                      : "Complete"}
                                  </Button>
                                )}
                            </Box>
                          ))}
                        </>
                      )}

                    <Divider sx={{ my: 2 }} />
                    {tripDetails.reconciliationStatus != "RECONCILED" && (
                      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Delete this visit? This cannot be undone.",
                              )
                            ) {
                              tripService
                                .deleteVisit(tripDetails.id, visit.id)
                                .then(() => {
                                  fetchTripDetails();
                                })
                                .catch((err) => {
                                  console.error("Failed to delete visit", err);
                                  showSnackbar(
                                    "Failed to delete visit.",
                                    "error",
                                  );
                                });
                            }
                          }}
                        >
                          Delete Visit
                        </Button>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
            {tripDetails.status === "COMPLETED" &&
              tripDetails.reconciliationStatus != "RECONCILED" && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}
                  >
                    <Button
                      variant="contained"
                      onClick={handleReconcile}
                      disabled={isReconciling}
                      width="200px"
                    >
                      {isReconciling ? "Reconciling..." : "Reconcile Trip"}
                    </Button>
                  </Box>
                </>
              )}
          </>
        ) : (
          <Typography variant="body2">Loading...</Typography>
        )}
      </Box>

      {/* Edit Visit Notes Dialog */}
      <Dialog
        open={!!editingVisit}
        onClose={() => setEditingVisit(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Visit Notes</DialogTitle>
        <DialogContent>
          <TextField
            label="Notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingVisit(null)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                setIsUpdatingNotes(true);
                await tripService.updateVisit(editingVisit.id, {
                  notes: editNotes,
                });
                await fetchTripDetails();
                setEditingVisit(null);
                setIsUpdatingNotes(false);
              } catch (err) {
                console.error("Failed to update visit notes:", err);
                showSnackbar("Error updating notes. Try again.", "error");
                setIsUpdatingNotes(false);
              }
            }}
            color="primary"
            disabled={isUpdatingNotes}
          >
            {isUpdatingNotes ? "Saving..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Visit Dialog */}
      <Dialog
        open={openAddVisitDialog}
        onClose={() => setOpenAddVisitDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Visit</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="party-type-label">Party Type</InputLabel>
            <Select
              labelId="party-type-label"
              value={partyType}
              label="Party Type"
              disabled // Automatically determined by trip type
            >
              <MenuItem value="CUSTOMER">Customer</MenuItem>
              <MenuItem value="LAUNDRY_VENDOR">Laundry Vendor</MenuItem>
            </Select>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
              Parties are restricted by trip type ({tripDetails?.tripType === "WASH_TRIP" ? "Laundry Trip" : "Customer Trip"})
            </Typography>
          </FormControl>

          <Autocomplete
            options={parties}
            getOptionLabel={(option) => option.name || ""}
            loading={loadingParties}
            onInputChange={handlePartyInputChange}
            onChange={(event, newValue) => {
              setSelectedParty(newValue);
              if (newValue && partyType === "CUSTOMER") {
                fetchIncompleteOrders(newValue.id);
              } else {
                setOrders([]);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={partyType === "CUSTOMER" ? "Search Customer" : "Search Vendor"}
                variant="outlined"
                margin="normal"
                required
              />
            )}
          />
          <List>
            {visitItems.map((item, index) => (
              <ListItem
                key={index}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  alignItems: "center",
                  paddingY: 1,
                }}
              >
                <FormControl sx={{ minWidth: 220, flex: 1 }} margin="dense">
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={item.orderId}
                    onChange={(e) =>
                      handleChange(index, "orderId", e.target.value)
                    }
                    label="Order"
                    renderValue={(selectedId) => {
                      const selectedOrder = orders.find(
                        (o) => o.id === selectedId,
                      );
                      return selectedOrder
                        ? `${selectedOrder.id} | ${new Date(
                          selectedOrder.orderDate,
                        ).toLocaleDateString()}`
                        : "";
                    }}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          borderRadius: 8,
                        },
                      },
                    }}
                  >
                    <ListSubheader
                      disableSticky
                      sx={{
                        display: "flex",
                        bgcolor: "#e0f7fa",
                        px: 2,
                        py: 1,
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: "#004d40",
                        borderBottom: "1px solid #ccc",
                      }}
                    >
                      <Box sx={{ width: "40%" }}>Ref ID</Box>
                      <Box sx={{ width: "60%" }}>Order Date</Box>
                    </ListSubheader>

                    {orders.map((order) => (
                      <MenuItem
                        key={order.id}
                        value={order.id}
                        sx={{
                          display: "flex",
                          px: 2,
                          fontSize: "0.875rem",
                          "&:hover": { bgcolor: "#f1f8e9" },
                          "&.Mui-selected": {
                            bgcolor: "#c8e6c9",
                            fontWeight: 600,
                          },
                        }}
                      >
                        <Box sx={{ width: "40%" }}>{order.id}</Box>
                        <Box sx={{ width: "60%" }}>
                          {new Date(order.orderDate).toLocaleDateString()}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 150, flex: 1 }} margin="dense">
                  <InputLabel>Delivery Type</InputLabel>
                  <Select
                    value={item.deliveryType}
                    onChange={(e) =>
                      handleChange(index, "deliveryType", e.target.value)
                    }
                    label="Delivery Type"
                  >
                    <MenuItem value="DELIVERY">Delivery</MenuItem>
                    <MenuItem value="PICKUP">Pickup</MenuItem>
                    <MenuItem value="BOTH">Both</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Remarks"
                  value={item.remarks}
                  onChange={(e) =>
                    handleChange(index, "remarks", e.target.value)
                  }
                  sx={{ flex: 2 }}
                  margin="dense"
                />

                <IconButton
                  onClick={() => handleRemoveItem(index)}
                  sx={{ alignSelf: "center" }}
                >
                  <DeleteIcon color="error" />
                </IconButton>
              </ListItem>
            ))}
          </List>

          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
            Add Visit Items
          </Typography>
          <Button
            variant="outlined"
            onClick={handleAddItem}
            startIcon={<AddIcon />}
          >
            Add Item
          </Button>
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            margin="normal"
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Planned Time"
              type="datetime-local"
              value={plannedTime}
              onChange={(e) => setPlannedTime(e.target.value)}
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            label="Sequence Number"
            value={sequenceNumber}
            onChange={(e) => setSequenceNumber(e.target.value)}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenAddVisitDialog(false)}
            color="secondary"
          >
            Cancel
          </Button>
          <Button onClick={handleAddVisit} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Visit Dialog */}
      <Dialog
        open={openCompleteVisitDialog}
        onClose={() => setOpenCompleteVisitDialog(false)}
      >
        <DialogTitle>Complete Visit</DialogTitle>
        <DialogContent>
          <DatePicker
            label="Completion Date"
            value={completionDate}
            onChange={(newValue) => setCompletionDate(newValue)}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenCompleteVisitDialog(false)}
            color="secondary"
          >
            Cancel
          </Button>
          <Button onClick={handleCompleteVisitSubmit} color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog
        open={openReconciliationDialog}
        onClose={() => setOpenReconciliationDialog(false)}
      >
        <DialogTitle>Add Reconciliation</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Item Type</InputLabel>
            <Select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            >
              <MenuItem value="PICKUP">Pickup Item</MenuItem>
              <MenuItem value="DELIVERY">Delivery Item</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Product</InputLabel>
            <Select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Expected Quantity"
            type="number"
            fullWidth
            margin="dense"
            value={expectedQuantity}
            onChange={(e) => setExpectedQuantity(e.target.value)}
          />
          <TextField
            label="Actual Quantity"
            type="number"
            fullWidth
            margin="dense"
            value={actualQuantity}
            onChange={(e) => setActualQuantity(e.target.value)}
          />
          <TextField
            label="Heavy Soiled Quantity"
            type="number"
            fullWidth
            margin="dense"
            value={heavySoiledQuantity}
            onChange={(e) => setHeavySoiledQuantity(e.target.value)}
          />
          <TextField
            label="Damaged Quantity"
            type="number"
            fullWidth
            margin="dense"
            value={damagedQuantity}
            onChange={(e) => setDamagedQuantity(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenReconciliationDialog(false)}
            color="secondary"
          >
            Cancel
          </Button>
          <Button onClick={handleReconciliationSubmit} color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <VisitLevelChallanDialog
        open={Boolean(visitChallanDialogVisit)}
        onClose={closeVisitChallanDialog}
        visit={visitChallanDialogVisit}
        challanNumber={visitChallanDialogNumber}
        onChallanNumberChange={handleVisitChallanNumberChange}
        onSubmit={handleVisitChallanSubmit}
        submitting={isVisitChallanSubmitting}
      />

      {/* Complete Delivery Request Dialog */}
      <CompleteDeliveryDialog
        open={openCompleteDialog}
        onClose={() => setOpenCompleteDialog(false)}
        selectedDeliveryRequest={selectedDeliveryRequest}
        selectedVisitId={selectedVisitId}
        selectedTripId={selectedTripId}
        tripDetails={tripDetails}
        tripService={tripService}
        showSnackbar={showSnackbar}
        fetchTrips={fetchTripDetails}
      />

      {/* Complete Pickup Request Dialog */}
      <CompletePickupDialog
        open={openPickupCompleteDialog}
        onClose={() => setOpenPickupCompleteDialog(false)}
        selectedPickupRequest={selectedPickupRequest}
        selectedVisitId={selectedVisitId}
        selectedTripId={selectedTripId}
        tripService={tripService}
        showSnackbar={showSnackbar}
        fetchTrips={fetchTripDetails}
      />


      {/* Assign Delivery Team & Vehicle Dialog */}
      <Dialog
        open={openAssignDriver}
        onClose={() => setOpenAssignDriver(false)}
      >
        <DialogTitle>
          {Array.isArray(tripDetails?.assignedPeople) &&
            tripDetails.assignedPeople.length > 0
            ? "Change Delivery Team"
            : tripDetails?.driverId
              ? "Change Delivery Team"
              : "Assign Delivery Team"}
        </DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            options={drivers}
            getOptionLabel={(o) => o?.name || String(o?.id || "")}
            value={(selectedDriverIds || [])
              .map((id) => drivers.find((d) => d.id === id))
              .filter(Boolean)}
            disableClearable
            slotProps={{
              listbox: {
                sx: {
                  p: 0,
                  "& .MuiAutocomplete-option": {
                    minHeight: "auto",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.9rem",
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
                if (!next[uid]) next[uid] = idx === 0 ? "DRIVER" : "HELPER";
              });
              Object.keys(next).forEach((uid) => {
                if (!ids.includes(Number(uid)) && !ids.includes(uid))
                  delete next[uid];
              });
              setRolesByUserId(next);
            }}
            disableCloseOnSelect
            renderOption={(props, option, { selected }) => (
              <li
                {...props}
                key={option.id}
                style={{
                  paddingTop: 4,
                  paddingBottom: 4,
                  paddingLeft: 8,
                  paddingRight: 8,
                }}
              >
                <Checkbox
                  size="small"
                  style={{ marginRight: 6 }}
                  checked={selected}
                />
                {option.name}
              </li>
            )}
            renderTags={(value) => {
              const text = (value || [])
                .map((u) => u?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    overflowY: "hidden",
                    maxWidth: "100%",
                    whiteSpace: "nowrap",
                    scrollbarWidth: "thin",
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                    {text}
                  </Typography>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Delivery Team"
                margin="dense"
                placeholder="Select team members"
              />
            )}
            fullWidth
            sx={{
              mt: 1,
              mb: 1,
              "& .MuiInputBase-root": {
                position: "relative",
                alignItems: "center",
                minHeight: 44,
                pt: 0.5,
                pb: 0.5,
                pr: "56px",
              },
              "& .MuiAutocomplete-inputRoot": {
                flexWrap: "nowrap",
              },
              "& .MuiChip-root": { height: 24, m: 0.25 },
              "& .MuiAutocomplete-input": {
                py: 0.5,
                minWidth: 8,
                flex: "0 0 auto",
              },
            }}
          />

          {selectedDriverIds && selectedDriverIds.length > 0 && (
            <Box sx={{ mb: 1 }}>
              {selectedDriverIds.map((uid, idx) => {
                const user = drivers.find((d) => d.id === uid);
                const role =
                  rolesByUserId[uid] || (idx === 0 ? "DRIVER" : "HELPER");
                return (
                  <Box
                    key={uid}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mb: 1,
                    }}
                  >
                    <Typography sx={{ minWidth: 140 }}>
                      {user?.name || uid}
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Role</InputLabel>
                      <Select
                        label="Role"
                        value={role}
                        onChange={(e) =>
                          setRolesByUserId((prev) => ({
                            ...prev,
                            [uid]: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="DRIVER">DRIVER</MenuItem>
                        <MenuItem value="HELPER">HELPER</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton
                      aria-label="Remove team member"
                      size="small"
                      onClick={() => {
                        setSelectedDriverIds((prev) =>
                          prev.filter((id) => id !== uid),
                        );
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
                );
              })}
            </Box>
          )}
          <FormControl fullWidth margin="dense">
            <InputLabel>Vehicle</InputLabel>
            <Select
              label="Vehicle"
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
            >
              {vehicles.map((vehicle) => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNumber} - {vehicle.type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDriver(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAssignDriver} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Challan Number Dialog */}
      <Dialog
        open={openUpdateChallanDialog}
        onClose={() => {
          setOpenUpdateChallanDialog(false);
          setChallanDialogVisit(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Update Challan Number</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Challan Number"
            type="text"
            fullWidth
            variant="outlined"
            value={newChallanNumberVal}
            onChange={(e) => setNewChallanNumberVal(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenUpdateChallanDialog(false);
              setChallanDialogVisit(null);
            }}
            color="secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateChallanSubmit}
            color="primary"
            variant="contained"
            disabled={isUpdatingChallan}
          >
            {isUpdatingChallan ? <CircularProgress size={20} /> : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleSnackbarClose}
      />
    </CustomDrawer>
  );
}

export default TripDetailsSidebar;
