import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  FormHelperText,
  Chip,
  Autocomplete,
  Checkbox,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DriveEta as DriveEtaIcon,
  LocationOn as LocationOnIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingActionsIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { subDays } from "date-fns";
import { tripService } from "../../services/tripService";
import { routeService } from "../../services/routeService";
import { inventoryService } from "../../services/inventoryService";
import { customerService } from "../../services/customerService";
import { laundryVendorService } from "../../services/laundryVendorService";
import { useDcid } from "../../context/DcidContext";
import TripDetailsSidebar from "./TripDetailsSidebar";
import CreateTripFromRouteDialog from "./CreateTripDialog/CreateTripFromRouteDialog";
import CustomSnackbar from "../layout/CustomSnackbar";
import TripTimelineDialog from "./TripTimelineDialog";
import { formatCustomDate } from "../../utils/dateUtils";

const DEFAULT_DATE_OFFSET_DAYS = 3;

function TripManagement() {
  const { dcid, setRequireWarehouse } = useDcid();
  const [trips, setTrips] = useState([]);
  const [openCreateFromRoute, setOpenCreateFromRoute] = useState(false);
  const [openAddVisit, setOpenAddVisit] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetails, setTripDetails] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    subDays(new Date(), DEFAULT_DATE_OFFSET_DAYS)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [routes, setRoutes] = useState([]);
  const [CustomSnackbarOpen, setCustomSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  const [visitData, setVisitData] = useState({
    partyId: null,
    partyType: "CUSTOMER",
    plannedTime: new Date(),
    notes: "",
  });
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [loadingParties, setLoadingParties] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  // Timeline dialog state
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineVisits, setTimelineVisits] = useState([]);
  const [timelineTitle, setTimelineTitle] = useState("");

  //warehouse checking
  const ensureWarehouseSelected = () => {
    if (!dcid) {
      setRequireWarehouse(true); //  lock UI & open pill
      return false;
    }
    return true;
  };

  const fetchTrips = useCallback(async () => {
    try {
      const tripsData = await tripService.searchTrips(startDate, endDate);
      setTrips(tripsData);
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const routesData = await tripService.getRoutes();
        setRoutes(Array.isArray(routesData) ? routesData : []);
      } catch (error) {
        console.error("Failed to fetch routes:", error);
      }
    };

    loadRoutes();
  }, []);

  // Load warehouses when a create dialog opens (and once initially for safety)
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const list = await inventoryService.getWarehouses();
        setWarehouses(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("Failed to load warehouses", e);
      }
    };
    if (openAddVisit) {
      loadWarehouses();
    }
    // Also load once on mount in case dcid is needed earlier
    if (!warehouses.length) {
      loadWarehouses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddVisit]);

  const fetchTripDetails = async (tripId) => {
    try {
      const details = await tripService.getTripDetails(tripId);
      setTripDetails(details);
      setSidebarOpen(true);
    } catch (error) {
      const backendMessage =
        error.response?.data?.message ||
        "Failed to fetch trip details. Please try again.";
      setErrorMessage(backendMessage);
      setSnackbarSeverity("error");
      setCustomSnackbarOpen(true);
    }
  };

  const handleAddVisit = async () => {
    if (!selectedParty) {
      setErrorMessage("Please select a party");
      setSnackbarSeverity("error");
      setCustomSnackbarOpen(true);
      return;
    }
    try {
      const payload = {
        tripId: selectedTrip.id,
        partyId: selectedParty.id,
        partyType: selectedTrip.tripType === "ORDER_TRIP" ? "CUSTOMER" : "LAUNDRY_VENDOR",
        plannedTime: visitData.plannedTime,
        visitFlowType: "UNTAGGED",
        visitRequests: [],
        notes: visitData.notes,
      };
      await tripService.addVisit(payload);
      setOpenAddVisit(false);
      setVisitData({
        partyId: null,
        partyType: "CUSTOMER",
        plannedTime: new Date(),
        notes: "",
      });
      setSelectedParty(null);
      fetchTrips();
    } catch (error) {
      const backendMessage =
        error.response?.data?.message ||
        "Failed to add visit. Please try again.";
      setErrorMessage(backendMessage);
      setSnackbarSeverity("error");
      setCustomSnackbarOpen(true);
    }
  };

  // Assigning driver is now handled inside TripDetailsSidebar

  // Deprecated external URL timeline handler removed in favor of inline dialog

  // Open inline timeline dialog for visits
  const handleOpenTimeline = async (e, trip) => {
    try {
      e?.stopPropagation?.();
      const details = await tripService.getTripDetails(trip.id);
      setTimelineVisits(details?.visits || []);
      setTimelineTitle(trip.tripName || `Trip ${trip.id}`);
      setTimelineOpen(true);
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        "Failed to load timeline. Please try again.";
      setErrorMessage(backendMessage);
      setSnackbarSeverity("error");
      setCustomSnackbarOpen(true);
    }
  };

  const handleTripClick = (trip) => {
    fetchTripDetails(trip.id);
  };

  const handleTripUpdate = (updatedTrip) => {
    setTripDetails(updatedTrip);
    setTrips((prevTrips) =>
      prevTrips.map((trip) => (trip.id === updatedTrip.id ? { ...updatedTrip, tripName: trip.tripName } : trip))
    );
  };


  // Removed: Assign driver handled in sidebar; no separate opener needed
  const handleDeleteTrip = async (tripId) => {
    if (window.confirm("Are you sure you want to delete this trip?")) {
      try {
        await tripService.deleteTripById(tripId);
        fetchTrips(); // Refresh the list of trips after deletion
      } catch (error) {
        const backendMessage =
          error.response?.data?.message ||
          "Failed to delete trip. Please try again.";
        setErrorMessage(backendMessage);
        setSnackbarSeverity("error");
        setCustomSnackbarOpen(true);
      }
    }
  };

  // Client-side filtering by trip type
const selectedRoute = useMemo(() => {
  if (routeFilter === "ALL") return null;

  return routes.find(
    (r) => String(r.id) === String(routeFilter)
  );
}, [routeFilter, routes]);

const routeName = selectedRoute?.name?.trim().toLowerCase();

const filteredTrips = useMemo(() => {
  return trips.filter((trip) => {
    const matchesType =
      typeFilter === "ALL" || trip.tripType === typeFilter;

    const matchesRoute =
      routeFilter === "ALL" ||
      (routeName &&
        (trip.tripName || "").toLowerCase().includes(routeName));

    return matchesType && matchesRoute;
  });
}, [trips, typeFilter, routeFilter, routeName]);

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 2,
          position: "sticky",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar + 1,
          backgroundColor: "background.paper",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          Trip Management
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            width: "100%",
          }}
        >
          {/* Left group: Start Date, End Date, Apply */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: { xs: "wrap", md: "nowrap" },
              overflowX: { xs: "auto", md: "visible" },
              pb: 0.5,
            }}
          >
            <Box sx={{ width: 180, minWidth: 150 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    sx: {
                      backgroundColor: "background.paper",
                      borderRadius: 1,
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ width: 180, minWidth: 150 }}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    sx: {
                      backgroundColor: "background.paper",
                      borderRadius: 1,
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ width: 180, minWidth: 150 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="type-filter-label">Trip Type</InputLabel>
                <Select
                  labelId="type-filter-label"
                  id="type-filter"
                  value={typeFilter}
                  label="Trip Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                  sx={{
                    backgroundColor: "background.paper",
                    borderRadius: 1,
                  }}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="ORDER_TRIP">Customer Trip</MenuItem>
                  <MenuItem value="WASH_TRIP">Laundry Trip</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ width: 180, minWidth: 150 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="route-filter-label">Route</InputLabel>
                <Select
                  labelId="route-filter-label"
                  id="route-filter"
                  value={routeFilter}
                  label="Route"
                  onChange={(e) => setRouteFilter(e.target.value)}
                  sx={{
                    backgroundColor: "background.paper",
                    borderRadius: 1,
                  }}
                >
                  <MenuItem value="ALL">All Routes</MenuItem>
                  {routes.map((route) => (
                    <MenuItem key={route.id} value={String(route.id)}>
                      {route.name || `Route ${route.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Button
              variant="contained"
              onClick={fetchTrips}
              sx={{
                height: "40px",
                minWidth: 96,
                whiteSpace: "nowrap",
                textTransform: "none",
                background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
                boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
              }}
            >
              Apply
            </Button>
          </Box>          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              if (!ensureWarehouseSelected()) return;
              setOpenCreateFromRoute(true);
            }}
            sx={{
              height: "40px",
              minWidth: 200,
              whiteSpace: "nowrap",
              textTransform: "none",
            }}
            data-agent-action="create-trip"
          >
            Create Trip
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Trip ID</TableCell>
              <TableCell>Trip Name</TableCell>
              <TableCell>Trip Type</TableCell>
              <TableCell>Planned Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reconciliation Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTrips.map((trip) => (
              <TableRow
                key={trip.id}
                onClick={() => handleTripClick(trip)}
                sx={{
                  cursor: "pointer",
                  "& td": { py: 1 },
                }}
              >
                <TableCell>
                  <strong>{trip.id}</strong>
                </TableCell>
                <TableCell>
                  <strong>{trip.tripName}</strong>
                </TableCell>
                <TableCell>
                  {trip.tripType === "WASH_TRIP" ? "Laundry Trip" : "Customer Trip"}
                </TableCell>
                <TableCell>{formatCustomDate(trip.plannedDate)}</TableCell>
                <TableCell>
                  <Chip
                    label={trip.status}
                    size="small"
                    color={
                      trip.status === "COMPLETED"
                        ? "success"
                        : trip.status === "IN_PROGRESS"
                          ? "info"
                          : trip.status === "PENDING"
                            ? "warning"
                            : trip.status === "CANCELLED"
                              ? "error"
                              : "default"
                    }
                  />
                </TableCell>
                <TableCell>
                  {trip.reconciliationStatus === "RECONCILED" ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "success.main" }}>
                      <CheckCircleIcon sx={{ fontSize: "1rem" }} />
                      <Typography variant="caption" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
                        Reconciled
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                      <PendingActionsIcon sx={{ fontSize: "1rem" }} />
                      <Typography variant="caption" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
                        Pending
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    aria-label="Visits timeline"
                    size="small"
                    onClick={(e) => handleOpenTimeline(e, trip)}
                    color={
                      // highlight when a timeline/tracking URL is present
                      trip?.liveTrackingUrl ||
                        trip?.trackingUrl ||
                        trip?.gpsUrl ||
                        trip?.locationUrl
                        ? "primary"
                        : "default"
                    }
                  >
                    <LocationOnIcon />
                  </IconButton>
                  <IconButton
                    onClick={async (e) => {
                      e.stopPropagation();
                      setSelectedTrip(trip);
                      setOpenAddVisit(true);

                      // Pre-load parties based on tripType
                      const targetType = trip.tripType === "WASH_TRIP" ? "LAUNDRY_VENDOR" : "CUSTOMER";
                      setVisitData(prev => ({ ...prev, partyType: targetType }));
                      setLoadingParties(true);
                      try {
                        let list = [];
                        if (targetType === "CUSTOMER") {
                          list = await routeService.getAllCustomers();
                        } else {
                          list = await laundryVendorService.getAllVendors();
                        }
                        setParties(Array.isArray(list) ? list : (list?.content || []));
                      } catch (err) {
                        console.error("Failed to load parties", err);
                      } finally {
                        setLoadingParties(false);
                      }
                    }}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TripDetailsSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tripDetails={tripDetails}
        fetchTrips={fetchTrips}
        onTripUpdate={handleTripUpdate}
      />


      <Dialog
        open={openAddVisit}
        onClose={() => setOpenAddVisit(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Visit</DialogTitle>
        <DialogContent>
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

          <FormControl fullWidth margin="dense">
            <InputLabel>Party Type</InputLabel>
            <Select
              value={visitData.partyType}
              label="Party Type"
              disabled
            >
              <MenuItem value="CUSTOMER">Customer</MenuItem>
              <MenuItem value="LAUNDRY_VENDOR">Laundry Vendor</MenuItem>
            </Select>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
              Restricted by trip type ({selectedTrip?.tripType === "WASH_TRIP" ? "Laundry Trip" : "Customer Trip"})
            </Typography>
          </FormControl>

          <Autocomplete
            fullWidth
            sx={{ mt: 1 }}
            options={parties}
            getOptionLabel={(option) => option.name || ""}
            value={selectedParty}
            onChange={(event, newValue) => {
              setSelectedParty(newValue);
            }}
            loading={loadingParties}
            onOpen={async () => {
              if (parties.length === 0) {
                setLoadingParties(true);
                try {
                  let list = [];
                  if (visitData.partyType === "CUSTOMER") {
                    list = await customerService.getAllCustomers();
                  } else {
                    list = await laundryVendorService.getAllVendors();
                  }
                  setParties(Array.isArray(list) ? list : (list?.content || []));
                } catch (err) {
                  console.error("Failed to load parties", err);
                } finally {
                  setLoadingParties(false);
                }
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={`Select ${visitData.partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'}`}
                variant="outlined"
                required
              />
            )}
          />

          <DatePicker
            sx={{ mt: 2, width: "100%" }}
            label="Planned Time"
            value={visitData.plannedTime}
            onChange={(date) => setVisitData({ ...visitData, plannedTime: date })}
            slotProps={{
              textField: {
                fullWidth: true,
                margin: "dense",
              },
            }}
          />

          <TextField
            label="Notes"
            value={visitData.notes}
            onChange={(e) =>
              setVisitData({
                ...visitData,
                notes: e.target.value,
              })
            }
            fullWidth
            margin="dense"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddVisit(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAddVisit} color="primary" variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <CustomSnackbar
        open={CustomSnackbarOpen}
        message={errorMessage}
        severity={snackbarSeverity}
        onClose={() => setCustomSnackbarOpen(false)}
      />

      <CreateTripFromRouteDialog
        open={openCreateFromRoute}
        onClose={() => setOpenCreateFromRoute(false)}
        onCreated={async () => {
          try {
            await fetchTrips();
            setSnackbarSeverity("success");
            setErrorMessage("Trip created successfully");
            setCustomSnackbarOpen(true);
          } catch {
            // If fetching trips fails post-create, still show success since creation happened
            setSnackbarSeverity("success");
            setErrorMessage("Trip created successfully");
            setCustomSnackbarOpen(true);
          }
        }}
      />

      <TripTimelineDialog
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        title={timelineTitle}
        visits={timelineVisits}
      />
    </Container>
  );
}

export default TripManagement;
