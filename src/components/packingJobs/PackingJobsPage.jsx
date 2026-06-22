import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import { endOfDay, startOfDay } from "date-fns";
import DataTable from "../common/tables/DataTable";
import FilterPanel from "../common/FilterPanel";
import GreenButton from "../common/GreenButton";
import StatusChip from "../common/StatusChip";
import CustomSnackbar from "../layout/CustomSnackbar";
import { packingJobService } from "../../services/packingJobService";
import { routeService } from "../../services/routeService";
import AssignPackerDialog from "./AssignPackerDialog";
import CreateAssignmentDialog from "./CreateAssignmentDialog";
import PackingJobDrawer from "./PackingJobDrawer";
import { extractListResponse, normalizePackingJob } from "./packingJobMapper";

const PACKING_JOB_REFERENCE_TYPE = "ORDER_FULFILLMENT";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Partially Packed", value: "PARTIALLY_PACKED" },
  { label: "Packed", value: "PACKED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const baseColumns = [
  { field: "packingJobId", headerName: "Job ID", type: "shortText", width: 60 },
  { field: "sourceName", headerName: "Customer Name", type: "longText", width: 200 },
  { field: "routeName", headerName: "Route Name", type: "shortText", width: 140 },
  // { field: "sequence", headerName: "Seq", type: "smallNumber", width: 80 },
  {
    field: "status",
    headerName: "Status",
    type: "shortText",
    width: 120,
    render: (value) => <StatusChip status={value} />,
  },
  { field: "itemCount", headerName: "Items", type: "smallNumber" },
  {
    field: "packedCount",
    headerName: "Packed",
    type: "smallNumber",
    render: (value, row) => {
      let color = "inherit";
      const packed = Number(value ?? 0);
      const items = Number(row.itemCount ?? 0);
      if (packed === items) {
        color = "success.main";
      } else if (packed < items) {
        color = "error.main";
      } else {
        color = "warning.main";
      }
      return <Box sx={{ color, fontWeight: 500, display: "inline" }}>{value}</Box>;
    },
  },
  { field: "sourceDate", headerName: "Order Date", type: "text", width: 100 },
];

export default function PackingJobsPage() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [status, setStatus] = useState("");
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [lastSubmittedFilterKey, setLastSubmittedFilterKey] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [assignJob, setAssignJob] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const toIsoBoundary = (date, boundaryFn) => {
    if (!date) return undefined;
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return boundaryFn(parsed).toISOString();
  };

  const filterPayload = useMemo(
    () => ({
      startDate: toIsoBoundary(startDate, startOfDay),
      endDate: toIsoBoundary(endDate, endOfDay),
      status: status || undefined,
      referenceType: PACKING_JOB_REFERENCE_TYPE,
    }),
    [startDate, endDate, status],
  );

  const currentFilterKey = useMemo(
    () =>
      JSON.stringify({
        search: search.trim(),
        ...filterPayload,
      }),
    [filterPayload, search],
  );
  const actionButtonLabel =
    lastSubmittedFilterKey && lastSubmittedFilterKey === currentFilterKey
      ? "Refresh"
      : "Submit";

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await packingJobService.getJobs(filterPayload);
      setJobs(extractListResponse(data).map(normalizePackingJob));
      setLastSubmittedFilterKey(currentFilterKey);
    } catch (err) {
      console.error("Failed to fetch packing jobs", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch packing jobs.",
      );
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [currentFilterKey, filterPayload]);

  const fetchJobsRef = useRef(fetchJobs);

  useEffect(() => {
    fetchJobsRef.current = fetchJobs;
  }, [fetchJobs]);

  useEffect(() => {
    fetchJobsRef.current();
  }, []);

  useEffect(() => {
    let active = true;
    const loadRoutes = async () => {
      try {
        const data = await routeService.getRoutes();
        if (active) {
          setRoutes(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load routes", err);
      }
    };
    loadRoutes();
    return () => {
      active = false;
    };
  }, []);

  const loadJobDetails = async (
    job,
    { openDrawer = false, updateSelectedJob = openDrawer } = {},
  ) => {
    if (openDrawer) setSelectedJob(job);
    if (!job?.id) return;

    setDetailLoading(true);
    try {
      const [data, assignments] = await Promise.all([
        packingJobService.getJob(job.id),
        packingJobService.getAssignments(job.id).catch(() => []),
      ]);
      const sessions = assignments.flatMap((assignment) => assignment.sessions || []);
      const normalized = normalizePackingJob({ ...data, assignments, sessions });
      if (updateSelectedJob) {
        setSelectedJob(normalized);
      }
      setJobs((prev) =>
        prev.map((item) => (item.id === normalized.id ? normalized : item)),
      );
      return normalized;
    } catch (err) {
      console.error("Failed to fetch packing job details", err);
      showSnackbar("Opened summary, but failed to refresh job details.", "warning");
      return job;
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchJobDetails = (job) => loadJobDetails(job, { openDrawer: true });

  const refreshSelectedJob = async () => {
    if (!selectedJob?.id) return;
    setDetailLoading(true);
    try {
      const [data, assignments] = await Promise.all([
        packingJobService.getJob(selectedJob.id),
        packingJobService.getAssignments(selectedJob.id).catch(() => []),
      ]);
      const sessions = assignments.flatMap((assignment) => assignment.sessions || []);
      const normalized = normalizePackingJob({ ...data, assignments, sessions });
      setSelectedJob(normalized);
      setJobs((prev) =>
        prev.map((item) => (item.id === normalized.id ? normalized : item)),
      );
    } catch (err) {
      console.error("Failed to refresh selected job", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    // 1. Filter by search query
    let result = jobs;
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((job) =>
        [job.jobNumber, job.sourceName, job.status]
          .some((value) => String(value).toLowerCase().includes(query))
      );
    }

    // 2. Filter by routeId
    if (selectedRouteId) {
      result = result.filter((job) => String(job.routeId) === String(selectedRouteId));
    }

    // 3. Sort by sequence (automatically sort by sequence !!)
    return [...result].sort((a, b) => {
      const seqA = a.sequence !== undefined && a.sequence !== null ? Number(a.sequence) : Infinity;
      const seqB = b.sequence !== undefined && b.sequence !== null ? Number(b.sequence) : Infinity;
      return seqA - seqB;
    });
  }, [jobs, search, selectedRouteId]);

  const handleCreateAssignment = async (payload) => {
    setSaving(true);
    try {
      await packingJobService.assignBulk(payload);
      setCreateAssignmentOpen(false);
      await fetchJobs();
      showSnackbar("Bulk assignment created.");
    } catch (err) {
      console.error("Failed to create bulk assignment", err);
      showSnackbar(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create bulk assignment.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignAssignment = async (assignment) => {
    if (!assignment?.id) return;
    const confirmed = window.confirm("Unassign this packer?");
    if (!confirmed) return;

    setSaving(true);
    try {
      await packingJobService.unassignAssignment(assignment.id);
      await refreshSelectedJob();
      await fetchJobs();
      showSnackbar("Assignment unassigned.");
    } catch (err) {
      console.error("Failed to unassign assignment", err);
      showSnackbar(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to unassign assignment.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };
 
  const handleClearSessions = async (assignment) => {
    if (!assignment?.id) return;
    const confirmed = window.confirm("Are you sure you want to clear all sessions and reset this assignment?");
    if (!confirmed) return;
 
    setSaving(true);
    try {
      await packingJobService.clearSessions(assignment.id);
      await refreshSelectedJob();
      await fetchJobs();
      showSnackbar("Sessions cleared and progress reset.");
    } catch (err) {
      console.error("Failed to clear sessions", err);
      showSnackbar(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to clear sessions.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const openAssignDialog = async (job = selectedJob) => {
    const detailedJob = await loadJobDetails(job, { updateSelectedJob: false });
    setAssignJob(detailedJob || job);
    setAssignOpen(true);
  };

  const columns = [
    ...baseColumns,
    {
      field: "actions",
      headerName: "Actions",
      type: "smallText",
      align: "right",
      width: 70,
      stopPropagation: true,
      render: (_, row) => (
        <Tooltip title="Assign Packer">
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              openAssignDialog(row);
            }}
          >
            <AssignmentIndIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const refreshData = async () => {
    await fetchJobs();
    if (selectedJob?.id) {
      await refreshSelectedJob();
    }
  };

  const handleAssignmentChange = async (message, severity = "success") => {
    await refreshData();
    showSnackbar(message, severity);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <FilterPanel
        title="Packing Jobs Management"
        actions={
          <GreenButton
            onClick={() => setCreateAssignmentOpen(true)}
            sx={{ height: 40, whiteSpace: "nowrap" }}
          >
            Create Assignment
          </GreenButton>
        }
      >
        <TextField
          size="small"
          label="Search Jobs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{
            width: 140,
            minWidth: 120,
            "& .MuiInputBase-root": { borderRadius: 1 },
          }}
        />
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={(value) => setStartDate(value)}
          slotProps={{
            textField: {
              size: "small",
              sx: { width: 150 },
            },
          }}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={(value) => setEndDate(value)}
          slotProps={{
            textField: {
              size: "small",
              sx: { width: 150 },
            },
          }}
        />
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>Route</InputLabel>
          <Select
            label="Route"
            value={selectedRouteId}
            onChange={(event) => setSelectedRouteId(event.target.value)}
          >
            <MenuItem value="">All Routes</MenuItem>
            {routes.map((route) => (
              <MenuItem key={route.id} value={route.id}>
                {route.name || route.routeName || `Route ${route.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value || "all"} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={fetchJobs}
          disabled={loading}
          sx={{ height: 40, whiteSpace: "nowrap", textTransform: "none" }}
        >
          {actionButtonLabel}
        </Button>
      </FilterPanel>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={filteredJobs}
        rowKey="id"
        onRowClick={fetchJobDetails}
        selectedId={selectedJob?.id}
      />

      <PackingJobDrawer
        job={selectedJob}
        loading={detailLoading}
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        onAssign={() => openAssignDialog(selectedJob)}
        onUnassign={handleUnassignAssignment}
        onClearSessions={handleClearSessions}
      />

      <AssignPackerDialog
        open={assignOpen}
        job={assignJob}
        saving={saving}
        onClose={() => {
          setAssignOpen(false);
          setAssignJob(null);
        }}
        onSuccess={handleAssignmentChange}
      />
      <CreateAssignmentDialog
        open={createAssignmentOpen}
        saving={saving}
        onClose={() => setCreateAssignmentOpen(false)}
        onAssign={handleCreateAssignment}
      />

      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Container>
  );
}
