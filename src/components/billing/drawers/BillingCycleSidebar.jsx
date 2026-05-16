import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  Stack,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import CustomDrawer from "../../common/CustomDrawer";
import StatusChip from "../../common/StatusChip";
import ConfirmDialog from "../../common/ConfirmDialog";
import CustomSnackbar from "../../layout/CustomSnackbar";
import { formatCustomDate, DATE_TIME } from "../../../utils/dateUtils";
import { billingService } from "../../../services/billingService";
import LockIcon from "@mui/icons-material/Lock";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import { 
  useBillingCycleDetails, 
  useGenerateInvoiceForBillingCycle,
  useLockBillingCycle 
} from "../../../hooks/useBilling";

function BillingCycleSidebar({ open, cycle, loading: preliminaryLoading, onClose, onDeleted }) {
  const { data: detailedCycle, isLoading: detailsLoading } = useBillingCycleDetails(cycle?.id);

  const generateInvoiceMutation = useGenerateInvoiceForBillingCycle();
  const lockCycleMutation = useLockBillingCycle();
  const loading = preliminaryLoading || detailsLoading || generateInvoiceMutation.isPending || lockCycleMutation.isPending;
  
  // Use detailed data if available, otherwise fallback to basic cycle data
  const currentCycle = detailedCycle || cycle;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const formatDate = (value) =>
    value ? formatCustomDate(value, DATE_TIME) : "—";

  const handleGenerateInvoice = async () => {
    if (!currentCycle?.id) return;
    try {
      await generateInvoiceMutation.mutateAsync(currentCycle.id);
      setSnackbarMessage("Invoice generated successfully!");
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage(
        error.response?.data?.message || "Failed to generate invoice."
      );
      setSnackbarOpen(true);
    }
  };

  const handleLockCycle = async () => {
    if (!currentCycle?.id) return;
    try {
      await lockCycleMutation.mutateAsync(currentCycle.id);
      setSnackbarMessage("Billing cycle locked successfully!");
      setSnackbarOpen(true);
      setLockDialogOpen(false);
    } catch (error) {
      setSnackbarMessage(
        error.response?.data?.message || "Failed to lock billing cycle."
      );
      setSnackbarOpen(true);
      setLockDialogOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentCycle) return;
    try {
      setDeleting(true);
      const result = await billingService.deleteBillingCycle(currentCycle.id);
      setDeleteDialogOpen(false);
      setSnackbarMessage(result?.message || `Billing cycle ${currentCycle.id} deleted successfully`);
      setSnackbarOpen(true);
      // Give snackbar a moment before closing drawer
      setTimeout(() => {
        onClose?.();
        onDeleted?.();
      }, 800);
    } catch (error) {
      setDeleteDialogOpen(false);
      setSnackbarMessage(
        error.response?.data?.message || "Failed to delete billing cycle."
      );
      setSnackbarOpen(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadAnnexure = () => {
    if (currentCycle?.annexureExcelUrl) {
      window.open(currentCycle.annexureExcelUrl, "_blank");
    }
  };

  return (
    <>
      <CustomDrawer open={open} onClose={onClose}>
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
              Billing Cycle
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}

        {!loading && currentCycle && (
          <Box sx={{ flexGrow: 1, overflowY: "auto", px: 3, py: 2 }}>
            <Typography sx={rowStyle}>
              <strong>Cycle ID:</strong> {currentCycle.id}
            </Typography>

            <Typography sx={rowStyle}>
              <strong>Bill To Name:</strong> {currentCycle.billToName}
            </Typography>

            <Typography sx={rowStyle}>
              <strong>Bill To ID:</strong> {currentCycle.billToId}
            </Typography>

            <Typography sx={rowStyle}>
              <strong>Bill To Type:</strong> {currentCycle.billToType}
            </Typography>

            <Typography sx={rowStyle}>
              <strong>Start Date:</strong>{" "}
              {formatDate(currentCycle.startAt || currentCycle.startDate)}
            </Typography>

            <Typography sx={rowStyle}>
              <strong>End Date:</strong>{" "}
              {formatDate(currentCycle.endAt || currentCycle.endDate)}
            </Typography>

            <Typography sx={rowStyle}>
              <strong>Cycle Duration:</strong>{" "}
              {currentCycle.cycleDurationDays
                ? `${currentCycle.cycleDurationDays} Days`
                : "—"}
            </Typography>

            <Typography sx={rowStyle}>
              <strong>Status:</strong>
              <Box component="span" sx={{ ml: 1 }}>
                <StatusChip status={currentCycle.status} />
              </Box>
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography sx={rowStyle}>
              <strong>Total Amount:</strong>{" "}
              {currentCycle.totalBillableAmount !== null ? `₹ ${currentCycle.totalBillableAmount}` : "—"}
            </Typography>

            <Typography sx={rowStyle}>
              <strong>Invoice Status:</strong>{" "}
              {currentCycle.invoiceStatus || "—"}
            </Typography>

            {currentCycle.invoiceNumber && (
              <Typography sx={rowStyle}>
                <strong>Invoice Number:</strong> {currentCycle.invoiceNumber}
              </Typography>
            )}

            {currentCycle.invoiceId && (
              <Typography sx={rowStyle}>
                <strong>Invoice ID:</strong> {currentCycle.invoiceId}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography sx={rowStyle}>
              <strong>Created Date:</strong>{" "}
              {formatDate(currentCycle.createdDate)}
            </Typography>

            {/* ── Delete Action ──────────────────────────── */}
            <Box sx={{ mt: 6, mb: 1 }}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{ 
                    textTransform: "none",
                    borderColor: "error.light",
                    "&:hover": {
                      borderColor: "error.main",
                      bgcolor: "error.lighter"
                    }
                  }}
                >
                  Delete Billing Cycle
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {!loading && currentCycle && (
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              gap: 1.5,
              position: "sticky",
              bottom: 0,
              zIndex: 1,
              boxShadow: "0 -4px 10px rgba(0,0,0,0.03)",
            }}
          >
            {currentCycle.annexureExcelUrl && (
              <Button
                variant="outlined"
                color="success"
                onClick={handleDownloadAnnexure}
                size="small"
                startIcon={<DownloadIcon />}
                title="Download Annexure"
                sx={{ 
                  flex: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 1.5,
                  minWidth: "fit-content",
                  px: 2
                }}
              >
                Download Annexure
              </Button>
            )}

            {currentCycle.status === "OPEN" && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setLockDialogOpen(true)}
                disabled={loading}
                size="small"
                startIcon={<LockIcon />}
                sx={{
                  flex: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 1.5,
                }}
              >
                {lockCycleMutation.isPending ? "Locking..." : "Lock Cycle"}
              </Button>
            )}

            {currentCycle.status === "LOCKED" && !currentCycle.invoiceId && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateInvoice}
                disabled={loading}
                size="small"
                sx={{
                  flex: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 1.5,
                }}
              >
                {generateInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
              </Button>
            )}
          </Box>
        )}
      </CustomDrawer>

      {/* ── Lock Confirm Dialog ──────────────── */}
      <ConfirmDialog
        open={lockDialogOpen}
        onClose={() => setLockDialogOpen(false)}
        onConfirm={handleLockCycle}
        title="Lock Billing Cycle"
        warning="State transition is permanent. The 'endAt' timestamp will be updated to the end of the current day."
        message={`Are you sure you want to lock billing cycle ${cycle?.id}? This will prevent further changes and finalize the billable items.`}
        confirmText="Lock"
        loading={lockCycleMutation.isPending}
        loadingText="Locking..."
      />

      {/* ── Delete Confirm Dialog ──────────────── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Billing Cycle"
        warning="This action is permanent and cannot be undone."
        message={`Are you sure you want to delete billing cycle ${cycle?.id}? All associated billable items, taxes, and any linked invoice will be permanently removed.`}
        confirmText="Delete"
        loading={deleting}
        loadingText="Deleting..."
      />

      {/* ── Snackbar ──────────────────────────── */}
      <CustomSnackbar
        open={snackbarOpen}
        onClose={() => {
          setSnackbarOpen(false);
          setSnackbarMessage("");
        }}
        message={snackbarMessage}
      />
    </>
  );
}

const rowStyle = {
  fontSize: 14,
  lineHeight: 1.6,
  mb: 0.75,
};

export default BillingCycleSidebar;