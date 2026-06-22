import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Autocomplete,
  Checkbox,
  Typography,
  IconButton,
  FormHelperText,
  Button,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CloseIcon from "@mui/icons-material/Close";
import tripService from "../../../services/tripService";
import userService from "../../../services/userService";

export default function LegacyManualCreateTripDialog({
  open,
  onClose,
  dcid,
  warehouses,
  fetchTrips,
  setErrorMessage,
  setSnackbarSeverity,
  setCustomSnackbarOpen,
}) {
  const [tripData, setTripData] = useState({
    tripName: "",
    tripNumber: "",
    notes: "",
    plannedDate: new Date(),
    assignedPeople: [],
    vehicleId: "",
    tripType: "ORDER_TRIP",
  });
  const [selectedDriverIds, setSelectedDriverIds] = useState([]);
  const [rolesByUserId, setRolesByUserId] = useState({});
  const [tripSubmitAttempted, setTripSubmitAttempted] = useState(false);

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const fetchDrivers = useCallback(async () => {
    try {
      const branchId = localStorage.getItem("branchId");
      if (!branchId) return;
      const driversData = await userService.getActiveUsers(branchId);
      setDrivers(driversData);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const branchId = localStorage.getItem("branchId");
      if (!branchId) return;
      const vehiclesData = await tripService.getVehiclesByBranch(branchId);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchDrivers();
      fetchVehicles();
    }
  }, [open, fetchDrivers, fetchVehicles]);

  const handleCreateTrip = async () => {
    const missingTripName = !tripData.tripName?.trim();
    const missingPlannedDate = !tripData.plannedDate;
    const missingDriver = !selectedDriverIds || selectedDriverIds.length === 0;
    const missingVehicle = !tripData.vehicleId;
    
    if (missingTripName || missingPlannedDate || missingDriver || missingVehicle) {
      setTripSubmitAttempted(true);
      return;
    }

    try {
      const assignedPeople = selectedDriverIds.map((uid, idx) => ({
        userId: uid,
        role: rolesByUserId[uid] || (idx === 0 ? "DRIVER" : "HELPER"),
      }));

      const payload = {
        deliveryDate: tripData.plannedDate ? new Date(tripData.plannedDate).toISOString().split('T')[0] : null,
        tripName: tripData.tripName,
        tripNumber: tripData.tripNumber,
        notes: tripData.notes,
        assignedPeople,
        vehicleId: tripData.vehicleId,
        dcId: dcid,
        branchId: localStorage.getItem("branchId"),
        tripType: tripData.tripType,
      };

      await tripService.createTrip(payload);
      onClose();
      setTripSubmitAttempted(false);
      setSelectedDriverIds([]);
      setRolesByUserId({});
      setTripData({
        tripName: "",
        tripNumber: "",
        notes: "",
        plannedDate: new Date(),
        assignedPeople: [],
        vehicleId: "",
        tripType: "ORDER_TRIP",
      });
      fetchTrips();
    } catch (error) {
      const backendMessage =
        error.response?.data?.message ||
        "Failed to create trip. Please try again.";
      setErrorMessage(backendMessage);
      setSnackbarSeverity("error");
      setCustomSnackbarOpen(true);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create Trip (Legacy)</DialogTitle>
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
        <DatePicker
          sx={{ mt: 1, width: "100%" }}
          label="Planned Date"
          value={tripData.plannedDate}
          onChange={(date) => setTripData({ ...tripData, plannedDate: date })}
          slotProps={{
            textField: {
              fullWidth: true,
              margin: "dense",
              sx: { width: "100%" },
              required: true,
              error: tripSubmitAttempted && !tripData.plannedDate,
              helperText:
                tripSubmitAttempted && !tripData.plannedDate
                  ? "Planned Date is required"
                  : undefined,
            },
          }}
        />
        <TextField
          label="Trip Name"
          value={tripData.tripName}
          onChange={(e) =>
            setTripData({
              ...tripData,
              tripName: e.target.value,
            })
          }
          fullWidth
          margin="dense"
          required
          error={tripSubmitAttempted && !tripData.tripName?.trim()}
          helperText={
            tripSubmitAttempted && !tripData.tripName?.trim()
              ? "Trip Name is required"
              : ""
          }
        />
        <TextField
          label="Trip Number"
          value={tripData.tripNumber}
          onChange={(e) =>
            setTripData({
              ...tripData,
              tripNumber: e.target.value,
            })
          }
          fullWidth
          margin="dense"
        />
        <TextField
          margin="dense"
          label="Notes"
          fullWidth
          variant="outlined"
          multiline
          rows={2}
          value={tripData.notes}
          onChange={(e) => setTripData({ ...tripData, notes: e.target.value })}
        />
        <FormControl fullWidth margin="dense" variant="outlined">
          <InputLabel>Trip Type</InputLabel>
          <Select
            value={tripData.tripType}
            onChange={(e) => setTripData({ ...tripData, tripType: e.target.value })}
            label="Trip Type"
          >
            <MenuItem value="ORDER_TRIP">Customer Trip</MenuItem>
            <MenuItem value="WASH_TRIP">Laundry Trip</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 1 }}>
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
              const nextRoles = { ...rolesByUserId };
              ids.forEach((uid, idx) => {
                if (!nextRoles[uid])
                  nextRoles[uid] = idx === 0 ? "DRIVER" : "HELPER";
              });
              Object.keys(nextRoles).forEach((uid) => {
                if (!ids.includes(Number(uid)) && !ids.includes(uid)) {
                  delete nextRoles[uid];
                }
              });
              setRolesByUserId(nextRoles);
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
                required
                error={
                  tripSubmitAttempted &&
                  (!selectedDriverIds || selectedDriverIds.length === 0)
                }
                helperText={
                  tripSubmitAttempted &&
                  (!selectedDriverIds || selectedDriverIds.length === 0)
                    ? "At least one team member is required"
                    : ""
                }
              />
            )}
            fullWidth
            sx={{
              "& .MuiInputBase-root": {
                position: "relative",
                alignItems: "center",
                minHeight: 48,
                pt: 0.5,
                pb: 0.5,
                pr: "56px",
              },
              "& .MuiAutocomplete-inputRoot": {
                flexWrap: "nowrap",
              },
              "& .MuiChip-root": { height: 26, m: 0.25 },
              "& .MuiAutocomplete-input": {
                py: 0.5,
                minWidth: 8,
                flex: "0 0 auto",
              },
            }}
          />
        </Box>

        {selectedDriverIds && selectedDriverIds.length > 0 && (
          <Box sx={{ mt: 1 }}>
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
                        prev.filter((id) => id !== uid)
                      );
                      setRolesByUserId((prev) => {
                        const next = { ...prev };
                        delete next[uid];
                        return next;
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
        <FormControl
          fullWidth
          margin="dense"
          required
          error={tripSubmitAttempted && !tripData.vehicleId}
        >
          <InputLabel required>Vehicle</InputLabel>
          <Select
            value={tripData.vehicleId}
            onChange={(e) =>
              setTripData({
                ...tripData,
                vehicleId: e.target.value,
              })
            }
          >
            {vehicles.map((vehicle) => (
              <MenuItem key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicleNumber} - {vehicle.type}
              </MenuItem>
            ))}
          </Select>
          {tripSubmitAttempted && !tripData.vehicleId && (
            <FormHelperText>Vehicle is required</FormHelperText>
          )}
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleCreateTrip} color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
