import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SendIcon from "@mui/icons-material/Send";
import BuildIcon from "@mui/icons-material/Build";
import {
  buildPayload,
  NEW_CONDITION_OPTIONS,
  NEW_STATUS_OPTIONS,
  parseInventoryIds,
  TO_LOCATION_TYPE_OPTIONS,
  validateForm,
} from "./inventoryStatusUpdateConfig";

const API_URL =
  "https://api.linengrass.com/api/soiled-inventory/pool-items/update-status";

export default function InventoryStatusUpdateModule() {
  const [formValues, setFormValues] = useState({
    inventoryItemIds: "",
    transactionReferenceId: "",
    newStatus: "",
    newCondition: "",
    toLocationType: "",
    toLocationReferenceId: "",
  });
  const [errors, setErrors] = useState({});
  const [payload, setPayload] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);

  const parsedInventoryState = useMemo(
    () => parseInventoryIds(formValues.inventoryItemIds),
    [formValues.inventoryItemIds]
  );

  const handleChange = useCallback((field) => {
    return (event) => {
      const value = event.target.value;

      setFormValues((current) => ({
        ...current,
        [field]: value,
      }));
      setErrors((current) => {
        if (!current[field] && field !== "inventoryItemIds") {
          return current;
        }

        const nextErrors = { ...current };
        delete nextErrors[field];

        if (field === "inventoryItemIds") {
          delete nextErrors.inventoryItemIds;
        }

        return nextErrors;
      });
      setPayload(null);
      setApiResponse(null);
      setApiError(null);
    };
  }, []);

  const handleConstruct = useCallback(() => {
    const validation = validateForm(formValues);
    setErrors(validation.errors);

    if (!validation.isValid) {
      setPayload(null);
      return;
    }

    setPayload(buildPayload(formValues, validation.parsedInventoryIds));
    setApiResponse(null);
    setApiError(null);
  }, [formValues]);

  const handleSubmit = useCallback(async () => {
    if (!payload || submitting) {
      return;
    }

    setSubmitting(true);
    setApiResponse(null);
    setApiError(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      let parsedResponse = rawResponse;

      if (rawResponse) {
        try {
          parsedResponse = JSON.parse(rawResponse);
        } catch {
          parsedResponse = rawResponse;
        }
      }

      if (!response.ok) {
        const formattedError =
          typeof parsedResponse === "string"
            ? parsedResponse
            : JSON.stringify(parsedResponse, null, 2);

        setApiError(`HTTP ${response.status}: ${formattedError}`);
        return;
      }

      setApiResponse(parsedResponse || { success: true });
    } catch (error) {
      setApiError(error.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }, [payload, submitting]);

  const handleCopyPayload = useCallback(() => {
    if (!payload) {
      return;
    }

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setSnackOpen(true);
  }, [payload]);

  const handleReset = useCallback(() => {
    setFormValues({
      inventoryItemIds: "",
      transactionReferenceId: "",
      newStatus: "",
      newCondition: "",
      toLocationType: "",
      toLocationReferenceId: "",
    });
    setErrors({});
    setPayload(null);
    setApiResponse(null);
    setApiError(null);
  }, []);

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
          Inventory Status Update
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label="POST" size="small" color="primary" variant="outlined" />
          <Chip
            label="/soiled-inventory/pool-items/update-status"
            size="small"
            variant="outlined"
          />
        </Stack>
      </Box>

      <Box
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          flexDirection: { xs: "column", lg: "row" },
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", lg: 540 },
            minWidth: { lg: 500 },
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: { lg: "1px solid #e0e0e0" },
            bgcolor: "#f7f8fa",
            p: 2,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflow: "hidden",
              borderRadius: 2,
            }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                Build Payload
              </Typography>
              <Alert
                severity="info"
                variant="outlined"
                sx={{
                  lineHeight: 1.45,
                  py: 0.25,
                  "& .MuiAlert-message": {
                    fontSize: "0.95rem",
                  },
                }}
              >
                Paste comma-separated inventory item IDs, construct the payload,
                review it, and then submit to the API.
              </Alert>
            </Stack>

            <TextField
              label="Inventory Item IDs"
              value={formValues.inventoryItemIds}
              onChange={handleChange("inventoryItemIds")}
              multiline
              fullWidth
              required
              placeholder="101, 102, 103"
              error={Boolean(errors.inventoryItemIds)}
              helperText={
                errors.inventoryItemIds ||
                "Enter one or more comma-separated numeric inventory item IDs."
              }
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInputBase-root": {
                  height: "auto",
                  minHeight: 170,
                  alignItems: "flex-start",
                },
                "& textarea": {
                  minHeight: "170px !important",
                },
                "& .MuiInputLabel-root": {
                  fontSize: "1rem",
                  lineHeight: "1.4rem",
                },
              }}
            />

            {parsedInventoryState.invalidEntries.length > 0 && (
              <Alert severity="error" variant="outlined">
                Invalid entries: {parsedInventoryState.invalidEntries.join(", ")}
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              <TextField
                label="Transaction Reference ID"
                value={formValues.transactionReferenceId}
                onChange={handleChange("transactionReferenceId")}
                type="number"
                required
                fullWidth
                error={Boolean(errors.transactionReferenceId)}
                helperText={errors.transactionReferenceId}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="To Location Reference ID"
                value={formValues.toLocationReferenceId}
                onChange={handleChange("toLocationReferenceId")}
                type="number"
                required
                fullWidth
                error={Boolean(errors.toLocationReferenceId)}
                helperText={errors.toLocationReferenceId}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                select
                label="New Status"
                value={formValues.newStatus}
                onChange={handleChange("newStatus")}
                required
                fullWidth
                error={Boolean(errors.newStatus)}
                helperText={errors.newStatus}
                InputLabelProps={{ shrink: true }}
              >
                {NEW_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="New Condition"
                value={formValues.newCondition}
                onChange={handleChange("newCondition")}
                required
                fullWidth
                error={Boolean(errors.newCondition)}
                helperText={errors.newCondition}
                InputLabelProps={{ shrink: true }}
              >
                {NEW_CONDITION_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="To Location Type"
                value={formValues.toLocationType}
                onChange={handleChange("toLocationType")}
                required
                fullWidth
                error={Boolean(errors.toLocationType)}
                helperText={errors.toLocationType}
                InputLabelProps={{ shrink: true }}
                sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
              >
                {TO_LOCATION_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.25,
              }}
            >
              <Button
                variant="contained"
                startIcon={<BuildIcon />}
                onClick={handleConstruct}
                size="medium"
              >
                Construct Object
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SendIcon />
                  )
                }
                onClick={handleSubmit}
                disabled={!payload || submitting}
                size="medium"
              >
                {submitting ? "Submitting…" : "Submit to API"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyPayload}
                disabled={!payload}
                size="medium"
              >
                Copy Payload
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                disabled={submitting}
                size="medium"
              >
                Reset
              </Button>
            </Box>
          </Paper>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            p: 3,
            gap: 2.5,
            bgcolor: "#f4f6f8",
          }}
        >
          {!payload ? (
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                borderRadius: 2,
              }}
            >
              <Stack alignItems="center" spacing={1.5}>
                <BuildIcon sx={{ fontSize: 42, color: "#c2c6cc" }} />
                <Typography variant="body1" color="text.secondary">
                  Construct the object to review the payload before submission.
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Review
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Verify the constructed values before submitting to the API.
                    </Typography>
                  </Box>
                  <Divider />
                  <Stack spacing={1.25}>
                    <Typography variant="body2">
                      <strong>Count of inventory IDs:</strong>{" "}
                      {payload.inventoryItemIds.length}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Inventory IDs list:</strong>{" "}
                      {payload.inventoryItemIds.join(", ")}
                    </Typography>
                    <Typography variant="body2">
                      <strong>transactionReferenceId:</strong>{" "}
                      {payload.transactionReferenceId}
                    </Typography>
                    <Typography variant="body2">
                      <strong>newStatus:</strong> {payload.newStatus}
                    </Typography>
                    <Typography variant="body2">
                      <strong>newCondition:</strong> {payload.newCondition}
                    </Typography>
                    <Typography variant="body2">
                      <strong>toLocationType:</strong> {payload.toLocationType}
                    </Typography>
                    <Typography variant="body2">
                      <strong>toLocationReferenceId:</strong>{" "}
                      {payload.toLocationReferenceId}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: "#fafafa",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    Constructed Payload
                  </Typography>
                </Box>
                <Box
                  component="pre"
                  sx={{
                    display: "block",
                    m: 0,
                    p: 2,
                    overflow: "auto",
                    fontSize: "0.78rem",
                    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {JSON.stringify(payload, null, 2)}
                </Box>
              </Paper>
            </>
          )}
        </Box>
      </Box>

      {(apiResponse || apiError) && (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: "2px solid",
            borderTopColor: apiError ? "error.main" : "success.main",
            bgcolor: "#fff",
            maxHeight: 240,
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
            {apiError
              ? apiError
              : typeof apiResponse === "string"
                ? apiResponse
                : JSON.stringify(apiResponse, null, 2)}
          </Box>
        </Box>
      )}

      <Snackbar
        open={snackOpen}
        autoHideDuration={2000}
        onClose={() => setSnackOpen(false)}
        message="Payload copied to clipboard"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
