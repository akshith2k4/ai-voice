import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import CustomDrawer from "../../common/CustomDrawer";
import StatusChip from "../../common/StatusChip";
import { formatCustomDate, DATE_TIME } from "../../../utils/dateUtils";

function BillingPreferenceSidebar({ open, preference, loading, onClose }) {
  const formatDate = (value) =>
    value ? formatCustomDate(value, DATE_TIME) : "—";

  return (
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
        <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
          Billing Preference
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {!loading && preference && (
        <Box sx={{ flexGrow: 1, overflowY: "auto", px: 3, py: 2 }}>
          <Typography sx={rowStyle}>
            <strong>Preference ID:</strong> {preference.id}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Bill To ID:</strong> {preference.billToId}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Bill To Type:</strong> {preference.billToType}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Frequency:</strong> {preference.frequency}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Cycle Duration:</strong>{" "}
            {preference.cycleDurationDays
              ? `${preference.cycleDurationDays} Days`
              : "—"}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Anchor Date:</strong>{" "}
            {formatDate(preference.anchorDate)}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Timezone:</strong> {preference.timezone || "—"}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Credit Days:</strong>{" "}
            {preference.creditDays ?? "0"}
          </Typography>

          <Typography sx={rowStyle}>
            <strong>Status:</strong>
            <Box component="span" sx={{ ml: 1 }}>
              <StatusChip status={preference.status} />
            </Box>
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography sx={rowStyle}>
            <strong>Created Date:</strong>{" "}
            {formatDate(preference.createdAt)}
          </Typography>
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

export default BillingPreferenceSidebar;