import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Divider,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { addDays, format } from "date-fns";
import { routeService } from "../../services/routeService";
import { userService } from "../../services/userService";
import { packingJobService } from "../../services/packingJobService";
import { normalizePackingJob } from "./packingJobMapper";

const JOB_ASSIGNMENT_TYPE = "JOB";

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const getRouteLabel = (route) => route?.name || route?.routeName || `Route ${route?.id ?? ""}`;
const getUserLabel = (user) => user?.name || user?.userName || `User ${user?.id ?? ""}`;

const jobColumns = [
  { field: "jobNumber", headerName: "Job Number", type: "shortText" },
  { field: "sourceName", headerName: "Source Name", type: "longText" },
  {
    field: "status",
    headerName: "Status",
    type: "shortText",
    render: (value) => value || "--",
  },
];

export default function CreateAssignmentDialog({ open, saving, onClose, onAssign }) {
  const branchId =
    typeof window !== "undefined" ? localStorage.getItem("branchId") : null;

  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 1));
  const [selectedUser, setSelectedUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobIds, setSelectedJobIds] = useState(() => new Set());
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setRoutes([]);
    setUsers([]);
    setSelectedRoute(null);
    setSelectedDate(addDays(new Date(), 1));
    setSelectedUser(null);
    setJobs([]);
    setSelectedJobIds(new Set());
    setLoadingLookups(false);
    setLoadingJobs(false);
    setError("");
  };

  useEffect(() => {
    if (!open) return;

    let active = true;
    const loadLookups = async () => {
      setError("");
      setLoadingLookups(true);
      try {
        const [routesData, usersData] = await Promise.all([
          routeService.getRoutes(),
          userService.getActiveUsers(branchId),
        ]);

        if (!active) return;

        const routeList = Array.isArray(routesData) ? routesData : [];
        const userList = Array.isArray(usersData) ? usersData : [];
        setRoutes(routeList);
        setUsers(userList);
        setSelectedRoute(null);
        setSelectedDate(addDays(new Date(), 1));
        setSelectedUser(userList[0] || null);
        setJobs([]);
        setSelectedJobIds(new Set());
      } catch (err) {
        console.error("Failed to load lookup data", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load routes or users.",
        );
      } finally {
        if (active) setLoadingLookups(false);
      }
    };

    loadLookups();

    return () => {
      active = false;
    };
  }, [open, branchId]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !selectedRoute?.id || !selectedDate) {
      setJobs([]);
      setSelectedJobIds(new Set());
      return;
    }

    let active = true;
    const loadJobs = async () => {
      setLoadingJobs(true);
      setError("");
      try {
        const data = await packingJobService.getJobsByRouteAndDate({
          routeId: selectedRoute.id,
          date: format(selectedDate, "yyyy-MM-dd"),
        });
        if (!active) return;

        const normalized = asArray(data).map((job) => normalizePackingJob(job));
        setJobs(normalized);
        setSelectedJobIds(new Set());
      } catch (err) {
        console.error("Failed to load packing jobs by route/date", err);
        setJobs([]);
        setSelectedJobIds(new Set());
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load packing jobs for the selected route and date.",
        );
      } finally {
        if (active) setLoadingJobs(false);
      }
    };

    loadJobs();

    return () => {
      active = false;
    };
  }, [open, selectedRoute?.id, selectedDate]);

  const selectedJobs = useMemo(
    () => jobs.filter((job) => selectedJobIds.has(String(job.id))),
    [jobs, selectedJobIds],
  );

  const toggleJob = (jobId) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      const key = String(jobId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisibleJobs = (checked) => {
    setSelectedJobIds(() => {
      if (!checked) return new Set();
      return new Set(jobs.map((job) => String(job.id)));
    });
  };

  const buildPayload = () => {
    if (!selectedRoute?.id) {
      throw new Error("Select a route.");
    }
    if (!selectedDate) {
      throw new Error("Select a date.");
    }
    if (!selectedUser?.id) {
      throw new Error("Select a user.");
    }
    if (!selectedJobs.length) {
      throw new Error("Select at least one job.");
    }

    return selectedJobs.map((job) => ({
      jobId: job.id,
      userId: selectedUser.id,
      allocationLevelType: JOB_ASSIGNMENT_TYPE,
      productIds: [],
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = buildPayload();
      setError("");
      await onAssign(payload);
      resetForm();
    } catch (err) {
      setError(err?.message || "Fix the assignment values before saving.");
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Create Assignment</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
            gap: 3,
            p: 3,
            minHeight: "46vh",
          }}
        >
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.paper",
                p: 3,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <TextField
                select
                label="Route"
                size="small"
                fullWidth
                value={selectedRoute?.id ?? ""}
                onChange={(event) => {
                  const nextRoute = routes.find(
                    (route) => String(route.id) === String(event.target.value),
                  );
                  setSelectedRoute(nextRoute || null);
                }}
                disabled={loadingLookups}
              >
                <MenuItem value="">Select route</MenuItem>
                {routes.map((route) => (
                  <MenuItem key={route.id} value={route.id}>
                    {getRouteLabel(route)}
                  </MenuItem>
                ))}
              </TextField>

              <DatePicker
                label="Packing Job Date"
                value={selectedDate}
                onChange={(value) => setSelectedDate(value)}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    disabled: loadingLookups,
                  },
                }}
              />

              <FormControl size="small" fullWidth>
                <InputLabel>User</InputLabel>
                <Select
                  label="User"
                  value={selectedUser?.id ?? ""}
                  onChange={(event) => {
                    const nextUser = users.find(
                      (user) => String(user.id) === String(event.target.value),
                    );
                    setSelectedUser(nextUser || null);
                  }}
                  disabled={loadingLookups}
                >
                  <MenuItem value="">Select user</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {getUserLabel(user)}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select a user for the jobs.</FormHelperText>
              </FormControl>
            </Box>

          </Stack>

          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: 0.75,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Jobs from Route
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                <Chip
                  label={`${selectedJobs.length} Selected`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
                <Chip
                  label={`${jobs.length || 0} Available`}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              </Box>
            </Box>
            <Divider sx={{ mb: 1.5 }} />

            {!selectedRoute || !selectedDate ? (
              <Alert severity="info">Choose a route and date to load jobs.</Alert>
            ) : loadingJobs ? (
              <Alert severity="info">Loading jobs for the selected route.</Alert>
            ) : jobs.length === 0 ? (
              <Alert severity="warning">
                No packing jobs found for the selected route and date.
              </Alert>
            ) : (
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  overflow: "hidden",
                  maxHeight: "36vh",
                }}
              >
                <Box sx={{ overflowX: "auto", maxHeight: "36vh" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 48, fontWeight: 600 }}>
                          <Checkbox
                            size="small"
                            checked={jobs.length > 0 && selectedJobIds.size === jobs.length}
                            indeterminate={
                              selectedJobIds.size > 0 && selectedJobIds.size < jobs.length
                            }
                            onChange={(_, checked) => selectAllVisibleJobs(checked)}
                          />
                        </TableCell>
                        {jobColumns.map((column) => (
                          <TableCell
                            key={column.field}
                            sx={{ fontWeight: 600, minWidth: column.width || 120, py: 1 }}
                            align={column.align || "left"}
                          >
                            {column.headerName}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {jobs.map((job) => {
                        const selected = selectedJobIds.has(String(job.id));
                        return (
                          <TableRow
                            key={job.id}
                            hover
                            selected={selected}
                            onClick={() => toggleJob(job.id)}
                            sx={{ cursor: "pointer" }}
                          >
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              size="small"
                              checked={selected}
                              onChange={() => toggleJob(job.id)}
                            />
                          </TableCell>
                          {jobColumns.map((column) => (
                            <TableCell
                              key={column.field}
                              align={column.align || "left"}
                              sx={{ py: 1 }}
                            >
                              {column.render
                                ? column.render(job[column.field], job)
                                : job[column.field] ?? "--"}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || loadingLookups || loadingJobs}
        >
          {saving ? "Assigning..." : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
