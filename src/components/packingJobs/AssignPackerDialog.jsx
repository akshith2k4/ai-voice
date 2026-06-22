import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import StatusChip from "../common/StatusChip";
import LoaderScreen from "../dashboard/LoaderScreen";
import { packingJobService } from "../../services/packingJobService";
import { normalizePackingJob } from "./packingJobMapper";
import { userService } from "../../services/userService";

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const isActiveAssignment = (assignment) =>
  assignment?.status === "ASSIGNED" || assignment?.status === "IN_PROGRESS";

export default function AssignPackerDialog({
  open,
  job,
  saving,
  onClose,
  onSuccess,
}) {
  const [users, setUsers] = useState([]);
  const [jobDetails, setJobDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const activeAssignments = useMemo(
    () =>
      asArray(jobDetails?.assignments).filter(
        (assignment) =>
          isActiveAssignment(assignment) &&
          (!assignment?.allocationLevelType || assignment.allocationLevelType === "JOB"),
    ),
    [jobDetails],
  );

  const activeAssignedLabel = useMemo(
    () => activeAssignments[0]?.assignedTo || jobDetails?.assignedTo || "",
    [activeAssignments, jobDetails],
  );

  const fetchJobDetails = useCallback(async () => {
    if (!job?.id) return;
    setLoading(true);
    setError("");
    try {
      const [data, assignments] = await Promise.all([
        packingJobService.getJob(job.id),
        packingJobService.getAssignments(job.id).catch(() => []),
      ]);
      setJobDetails(normalizePackingJob({ ...data, assignments }));
    } catch (err) {
      console.error("Failed to load packing job details", err);
      setJobDetails(normalizePackingJob(job));
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load packing job details.",
      );
    } finally {
      setLoading(false);
    }
  }, [job]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const branchId = localStorage.getItem("branchId");
      const data = await userService.getActiveUsers(branchId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load packers", err);
      setUsers([]);
      setError("Failed to load packers.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setJobDetails(null);
      setSelectedUser(null);
      setNotes("");
      setError("");
      return;
    }

    setSelectedUser(null);
    setNotes("");
    fetchUsers();
    fetchJobDetails();
  }, [open, fetchJobDetails, fetchUsers]);

  useEffect(() => {
    if (!open || !users.length || !activeAssignedLabel) return;
    const matchedUser = users.find((user) => {
      const label = user?.name || user?.userName || String(user?.id || "");
      return label === activeAssignedLabel;
    });
    if (matchedUser) {
      setSelectedUser(matchedUser);
    }
  }, [open, users, activeAssignedLabel]);

  const handleAssign = async () => {
    if (!job?.id) {
      setError("Select a packing job first.");
      return;
    }
    if (!selectedUser?.id) {
      setError("Select a packer.");
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      await packingJobService.assignPacker({
        jobId: job.id,
        userId: selectedUser.id,
        allocationLevelType: "JOB",
        productIds: [],
        notes: notes || undefined,
      });
      await fetchJobDetails();
      onSuccess?.("Packer assigned.");
      onClose?.();
    } catch (err) {
      console.error("Failed to assign packer", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to assign packer.",
      );
    } finally {
      setActionLoading(false);
    }
  };


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>Assign Packer</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2.25} sx={{ mt: 1, minHeight: 330 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box
            sx={{
              minHeight: 250,
              display: "flex",
              flexDirection: "column",
              justifyContent: loading ? "center" : "flex-start",
            }}
          >
            {loading ? (
              <Box sx={{ py: 2 }}>
                <LoaderScreen minHeight="250px" />
              </Box>
            ) : (
              <>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "success.dark", fontWeight: 600, mb: 1 }}
                  >
                    Job Summary
                  </Typography>
                  <Stack spacing={0.75}>
                    <SummaryRow label="Job Number" value={jobDetails?.jobNumber || job?.jobNumber} />
                    <SummaryRow label="Source ID" value={jobDetails?.sourceId || job?.sourceId} />
                    <SummaryRow label="Source Name" value={jobDetails?.sourceName || job?.sourceName} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2">
                        <strong>Status:</strong>
                      </Typography>
                      <StatusChip status={jobDetails?.status || job?.status} />
                    </Box>
                  </Stack>
                </Paper>

                <Autocomplete
                  sx={{ mt: 1.75 }}
                  options={users}
                  loading={loadingUsers}
                  getOptionLabel={(option) =>
                    option?.name || option?.userName || String(option?.id || "")
                  }
                  value={selectedUser}
                  onChange={(_, value) => setSelectedUser(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Packer"
                      size="small"
                    />
                  )}
                />

              <TextField
                sx={{ mt: 0.75 }}
                fullWidth
                label="Notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                />
              </>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving || actionLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={saving || actionLoading || !selectedUser}
        >
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SummaryRow({ label, value }) {
  return (
    <Typography variant="body2" color="text.primary">
      <strong>{label}:</strong> {value ?? "--"}
    </Typography>
  );
}
