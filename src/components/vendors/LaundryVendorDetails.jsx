import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemIcon,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  GroupAdd as GroupAddIcon,
} from "@mui/icons-material";
import { laundryVendorService } from "../../services/laundryVendorService";
import { routeService } from "../../services/routeService";

function AssignCustomersDialog({ open, onClose, vendor, onAssigned }) {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Reuse cached fetch of customers
      routeService.getAllCustomers().then((data) => {
        setCustomers(data);
        setFiltered(data);
      });
      setSelectedIds([]);
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(customers);
    } else {
      setFiltered(
        customers.filter((c) =>
          [c.name, c.email, c.phone]
            .filter((v) => v !== undefined && v !== null)
            .some((v) => String(v).toLowerCase().includes(term))
        )
      );
    }
  }, [search, customers]);

  const toggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!vendor) return;
    setSubmitting(true);
    try {
      await laundryVendorService.assignCustomersToVendor(
        vendor.id,
        selectedIds
      );
      onAssigned?.();
      onClose();
    } catch (e) {
      console.error("Assign failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          bgcolor: "background.default",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        Assign Customers to {vendor?.name}
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "background.paper" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Box
          sx={{
            maxHeight: 360,
            overflowY: "auto",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          <List dense>
            {filtered.map((c) => (
              <ListItem
                key={c.id}
                onClick={() => toggle(c.id)}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedIds.includes(c.id)}
                    tabIndex={-1}
                  />
                </ListItemIcon>
                <Avatar sx={{ mr: 1, width: 28, height: 28 }}>
                  <PersonIcon fontSize="small" />
                </Avatar>
                {/* <ListItemText primary={c.name} secondary={c.email || c.phone} /> */}
                <ListItemText
                  primary={
                    <Typography sx={{ color: "black" }}>
                      {c.name}
                    </Typography>
                  }
                  secondary={c.email || c.phone}
                />
              </ListItem>
            ))}
            {filtered.length === 0 && (
              <ListItem>
                <ListItemText primary="No customers found" />
              </ListItem>
            )}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={!selectedIds.length || submitting}
          startIcon={
            submitting ? (
              <CircularProgress size={18} />
            ) : (
              <GroupAddIcon />
            )
          }
          sx={{
            background:
              "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
            boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
          }}
        >
          {submitting ? "Assigning..." : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function LaundryVendorDetails({ vendor, onClose }) {
  const [details, setDetails] = useState(vendor);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    severity: "success",
  });

  const mapped = useMemo(() => details?.customerMappings || [], [details]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return mapped;
    return mapped.filter((m) =>
      [m.customerName, m.status]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term))
    );
  }, [mapped, search]);

  useEffect(() => {
    // Fetch fresh vendor info including mappings on mount/open
    const fetch = async () => {
      if (!vendor?.id) return;
      setLoading(true);
      try {
        const data = await laundryVendorService.getVendorById(
          vendor.id
        );
        setDetails(data);
      } catch (e) {
        console.error("Failed loading vendor", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [vendor?.id]);

  const refresh = async () => {
    if (!vendor?.id) return;
    try {
      const data = await laundryVendorService.getVendorById(vendor.id);
      setDetails(data);
    } catch (e) {
      console.error(e);
    }
  };

  const removeMapping = async (customerId) => {
    if (!vendor?.id) return;
    try {
      await laundryVendorService.removeCustomerFromVendor(
        vendor.id,
        customerId
      );
      setSnack({
        open: true,
        msg: "Removed customer from vendor",
        severity: "success",
      });
      await refresh();
    } catch (e) {
      setSnack({
        open: true,
        msg: e.response?.data?.message || "Failed to remove",
        severity: "error",
      });
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          p: 2,
          px: 3,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "background.default",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Vendor Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {vendor?.name}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 3, pt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Contact
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> {details?.email || "-"}{" "}
          </Typography>
          <Typography variant="body2">
            <strong>Phone:</strong> {details?.phone || "-"}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip
              label={details?.isActive ? "Active" : "Inactive"}
              size="small"
              color={details?.isActive ? "success" : "error"}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Assigned Customers{" "}
            {mapped?.length ? `(${mapped.length})` : ""}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => setAssignOpen(true)}
            startIcon={<GroupAddIcon />}
            sx={{
              background:
                "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
              boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
            }}
          >
            Assign
          </Button>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search assigned customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            maxHeight: 360,
            overflowY: "auto",
            bgcolor: "background.paper",
          }}
        >
          {loading ? (
            <Box
              sx={{ p: 2, display: "flex", alignItems: "center" }}
            >
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2">Loading...</Typography>
            </Box>
          ) : (
            <List dense>
              {filtered.map((m) => (
                <ListItem
                  key={m.customerId}
                  sx={{
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <Avatar
                    sx={{ mr: 1, width: 28, height: 28 }}
                  >
                    <PersonIcon fontSize="small" />
                  </Avatar>
                  <ListItemText
                    primary={<Typography sx={{ color: 'black' }}>{m.customerName}</Typography>}
                    // secondary={
                    //   <Box
                    //     sx={{
                    //       display: "flex",
                    //       alignItems: "center",
                    //       gap: 1,
                    //     }}
                    //   >
                    //     <Chip
                    //       label={
                    //         m.status || "ASSIGNED"
                    //       }
                    //       size="small"
                    //       color={
                    //         (
                    //           m.status || ""
                    //         ).toUpperCase() ===
                    //           "ACTIVE"
                    //           ? "success"
                    //           : (
                    //             m.status || ""
                    //           ).toUpperCase() ===
                    //             "INACTIVE"
                    //             ? "error"
                    //             : "default"
                    //       }
                    //     />
                    //   </Box>
                    // }
                  />
                  <Box sx={{ ml: "auto" }}>
                    <Tooltip title="Remove">
                      <IconButton
                        edge="end"
                        onClick={() =>
                          removeMapping(m.customerId)
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
              {!filtered.length && (
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography color="text.secondary">
                        No customers assigned
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          )}
        </Box>
      </Box>

      <AssignCustomersDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        vendor={vendor}
        onAssigned={async () => {
          setSnack({
            open: true,
            msg: "Customers assigned successfully",
            severity: "success",
          });
          await refresh();
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LaundryVendorDetails;
