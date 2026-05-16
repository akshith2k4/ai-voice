import { useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SendIcon from "@mui/icons-material/Send";

import { formatHelperApiError } from "./formatHelperApiError";
import { helperService } from "../services/helperService";

export default function PopulateDeliveryItemsModule() {
  const [visitId, setVisitId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmedVisitId = visitId.trim();

    if (!trimmedVisitId || submitting) {
      return;
    }

    setSubmitting(true);
    setApiResponse(null);
    setApiError(null);

    try {
      const data = await helperService.populateDeliveryItemsFromPacking(
        trimmedVisitId
      );
      setApiResponse(data);
    } catch (error) {
      setApiError(formatHelperApiError(error));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, visitId]);

  const handleReset = useCallback(() => {
    setVisitId("");
    setApiResponse(null);
    setApiError(null);
  }, []);

  const handleCopy = useCallback(() => {
    if (!apiResponse) {
      return;
    }

    navigator.clipboard.writeText(JSON.stringify(apiResponse, null, 2));
    setSnackOpen(true);
  }, [apiResponse]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 3,
          py: 1.5,
          bgcolor: "#fff",
          borderBottom: "1px solid #e0e0e0",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Populate Item in Delivery Request
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label="POST" size="small" color="primary" variant="outlined" />
          <Chip
            label="/trips/visits/{visit_id}/populate-delivery-items-from-packing"
            size="small"
            variant="outlined"
          />
        </Stack>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: 720,
            p: 3,
            alignSelf: "flex-start",
          }}
        >
          <Stack spacing={2.5}>
            <Alert severity="info" variant="outlined">
              Enter a visit ID to populate delivery request items from packing for
              that visit.
            </Alert>

            <TextField
              label="Visit ID"
              value={visitId}
              onChange={(event) => setVisitId(event.target.value)}
              placeholder="Enter visit id"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SendIcon />
                  )
                }
                onClick={handleSubmit}
                disabled={!visitId.trim() || submitting}
              >
                {submitting ? "Submitting…" : "Populate Items"}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                disabled={submitting}
              >
                Reset
              </Button>
              <Button
                variant="text"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopy}
                disabled={!apiResponse}
              >
                Copy Response
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      {(apiResponse || apiError) && (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: "2px solid",
            borderTopColor: apiError ? "error.main" : "success.main",
            bgcolor: "#fff",
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 3,
              py: 1,
              bgcolor: apiError ? "#fff5f5" : "#f0faf0",
              borderBottom: "1px solid #eee",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color={apiError ? "error.main" : "success.main"}
            >
              {apiError ? "API ERROR" : "API RESPONSE — SUCCESS"}
            </Typography>
          </Box>
          <Box
            component="pre"
            sx={{
              display: "block",
              m: 0,
              px: 3,
              py: 1.5,
              fontSize: "0.78rem",
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {apiError ? apiError : JSON.stringify(apiResponse, null, 2)}
          </Box>
        </Box>
      )}

      <Snackbar
        open={snackOpen}
        autoHideDuration={2000}
        onClose={() => setSnackOpen(false)}
        message="Response copied to clipboard"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
