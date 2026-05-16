import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { DATE_TIME, formatCustomDate } from "../../utils/dateUtils";
import VisitImagesDialog from "../trips/VisitImagesDialog";
import CustomDrawer from "../common/CustomDrawer";
import StatusChip from "../common/StatusChip";
import { DAMAGE_STATUS } from "../../constants/damageAssessment";
import {
  useApproveDamageRequest,
  useRejectDamageRequest,
} from "../../hooks/useDamageAssessment";

function DamageAssessmentSidebar({ open, damage, loading, onClose }) {
  const approveAction = useApproveDamageRequest();
  const rejectAction = useRejectDamageRequest();

  const handleApprove = () => {
    approveAction.mutate(damage.id);
  };

  const handleReject = () => {
    if (window.confirm("Are you sure you want to reject this damage request?")) {
      rejectAction.mutate(damage.id);
    }
  };

  const formatDate = (value) =>
    value ? formatCustomDate(value, DATE_TIME) : "—";

  return (
    <CustomDrawer open={open} onClose={onClose}>
      {/* ================= HEADER  ================= */}
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
        <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
          Damage Request
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ================= CONTENT  ================= */}
      {!loading && damage && (
        <Box sx={{ flexGrow: 1, overflowY: "auto", px: 3, py: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ color: "success.dark", fontWeight: 500, mb: 1 }}
          >
            Damage Request Information
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Damage Request ID:</strong> {damage.id}
          </Typography>
          <Typography sx={rowStyle}>
            <strong>Request Date:</strong> {formatDate(damage.requestDate)}
          </Typography>
          <Typography sx={rowStyle}>
            <strong>Product ID:</strong> {damage.productId}
          </Typography>
          <Typography sx={rowStyle}>
            <strong>Product Name:</strong> {damage.productName}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Status:</strong>
            <Box component="span" sx={{ ml: 1 }}>
              <StatusChip status={damage.status} />
            </Box>
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="subtitle1"
            sx={{ color: "success.dark", fontWeight: 500, mb: 1 }}
          >
            Source Information
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Source ID:</strong> {damage.sourceId}
          </Typography>
          <Typography sx={rowStyle}>
            <strong>Source Type:</strong> {damage.sourceType}
          </Typography>
          <Typography sx={rowStyle}>
            <strong>Source Name:</strong> {damage.sourceName || damage.sourceId}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="subtitle1"
            sx={{ color: "success.dark", fontWeight: 500, mb: 1 }}
          >
            Product Information
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Quantity:</strong> {damage.quantity}
          </Typography>
          <Typography sx={rowStyle}>
            <strong>Price:</strong> {damage.price ?? "—"}
          </Typography>
          <Typography sx={rowStyle}>
            <strong>Notes:</strong> {damage.notes || "—"}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <VisitImagesDialog
            imageUrls={damage.images || []}
            title="Damage Images"
          />
        </Box>
      )}

      {/* ================= ACTIONS ================= */}
      {!loading && damage?.status === DAMAGE_STATUS.PENDING && (
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            gap: 1,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={approveAction.isPending}
            sx={{ color: 'white' }}
          >
            Approve
          </Button>

          <Button
            fullWidth
            variant="contained"
            sx={{
              background: "#fd5c63",
              "&:hover": { background: "#fd5c63" },
            }}
            onClick={handleReject}
            disabled={rejectAction.isPending}
          >
            Reject
          </Button>
        </Box>
      )}
    </CustomDrawer>
  );
}

const rowStyle = {
  fontSize: 14,
  lineHeight: 1.6,
  mb: 0.75,
};

export default DamageAssessmentSidebar;
