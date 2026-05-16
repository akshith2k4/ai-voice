import { useCallback, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  CircularProgress,
  Snackbar,
  Divider,
  Stack,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SendIcon from "@mui/icons-material/Send";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import { parseTags, validateTag, buildPayload } from "./rfidHelpers";
import { formatHelperApiError } from "./formatHelperApiError";
import { helperService } from "../services/helperService";

export default function RfidScanPage() {
  const [input, setInput] = useState("");
  const [validItems, setValidItems] = useState([]);
  const [invalidItems, setInvalidItems] = useState([]);
  const [payload, setPayload] = useState(null);
  const [constructed, setConstructed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);

  const [snackOpen, setSnackOpen] = useState(false);

  const handleConstruct = useCallback(() => {
    const tags = parseTags(input);
    const valid = [];
    const invalid = [];

    for (const tag of tags) {
      const result = validateTag(tag);
      if (result.valid) {
        valid.push(result);
      } else {
        invalid.push(result);
      }
    }

    setValidItems(valid);
    setInvalidItems(invalid);

    if (valid.length > 0) {
      setPayload(buildPayload(valid));
    } else {
      setPayload(null);
    }

    setConstructed(true);
    setApiResponse(null);
    setApiError(null);
  }, [input]);

  const handleSubmit = useCallback(async () => {
    if (!payload || submitting) return;
    setSubmitting(true);
    setApiResponse(null);
    setApiError(null);

    try {
      const data = await helperService.submitRfidScanData(payload);
      setApiResponse(data);
    } catch (error) {
      setApiError(formatHelperApiError(error));
    } finally {
      setSubmitting(false);
    }
  }, [payload, submitting]);

  const handleCopy = useCallback(() => {
    if (payload) {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setSnackOpen(true);
    }
  }, [payload]);

  const handleReset = () => {
    setInput("");
    setValidItems([]);
    setInvalidItems([]);
    setPayload(null);
    setConstructed(false);
    setApiResponse(null);
    setApiError(null);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 1.5,
          bgcolor: "#fff",
          borderBottom: "1px solid #e0e0e0",
          flexShrink: 0,
        }}
        >
          <Typography variant="h6" fontWeight={700}>
            RFID Scan Data Builder
          </Typography>
          <Chip
            label="Reader: RFID-BIN-YPR-01"
            size="small"
            variant="outlined"
          />
      </Box>

      {/* Main content: left + right split */}
      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* ===== LEFT PANEL — Input & Controls ===== */}
        <Box
          sx={{
            width: 380,
            minWidth: 340,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #e0e0e0",
            bgcolor: "#fff",
          }}
        >
          <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>
            <Alert severity="info" variant="outlined" sx={{ mb: 2, fontSize: "0.75rem" }}>
              This page assumes full RFID tags like{" "}
              <code style={{ background: "#e3f2fd", padding: "1px 4px", borderRadius: 3 }}>
                2B113391
              </code>
              . If you mean numeric inventory IDs without prefixes, the mapping
              logic needs a different rule.
            </Alert>

            <TextField
              label="RFID Tags"
              helperText="Paste tags separated by spaces, commas, or newlines"
              multiline
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"2B113391, 1B002345\n3D009911 BB100200"}
              InputLabelProps={{ shrink: true }}
              sx={{
                flex: 1,
                mb: 2,
                "& .MuiInputBase-root": {
                  height: "auto",
                  minHeight: 200,
                  alignItems: "flex-start",
                },
                "& .MuiInputLabel-root": {
                  fontSize: "1rem",
                  lineHeight: "1.4rem",
                },
              }}
            />

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<BuildIcon />}
                onClick={handleConstruct}
                disabled={!input.trim()}
                fullWidth
                size="large"
              >
                Construct
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                color="inherit"
                size="large"
                sx={{ color: "#666", minWidth: 110 }}
              >
                Reset
              </Button>
            </Stack>

            {/* Payload JSON — collapsible in left panel */}
            {payload && (
              <Paper variant="outlined" sx={{ mt: 2.5, overflow: "hidden", flexShrink: 0 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 1.5, py: 1, bgcolor: "#fafafa" }}
                >
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    PAYLOAD JSON
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                    onClick={handleCopy}
                    sx={{ fontSize: "0.7rem", minWidth: 0 }}
                  >
                    Copy
                  </Button>
                </Stack>
                <Divider />
                <Box
                  component="pre"
                  sx={{
                    display: "block",
                    m: 0,
                    p: 1.5,
                    overflow: "auto",
                    maxHeight: 250,
                    fontSize: "0.7rem",
                    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                    lineHeight: 1.5,
                    bgcolor: "#fafafa",
                  }}
                >
                  {JSON.stringify(payload, null, 2)}
                </Box>
              </Paper>
            )}
          </Box>
        </Box>

        {/* ===== RIGHT PANEL — Review & Validate ===== */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {!constructed ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#bbb",
              }}
            >
              <Stack alignItems="center" spacing={1}>
                <BuildIcon sx={{ fontSize: 48, color: "#ddd" }} />
                <Typography variant="body1" color="text.disabled">
                  Paste tags and click Construct to preview
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
              {/* Summary strip */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 3,
                  py: 1.5,
                  bgcolor: "#fff",
                  borderBottom: "1px solid #eee",
                  flexShrink: 0,
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  label={`${validItems.length} Valid`}
                  color="success"
                  size="small"
                />
                <Chip
                  icon={<ErrorOutlineIcon />}
                  label={`${invalidItems.length} Invalid`}
                  color={invalidItems.length > 0 ? "error" : "default"}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
                  {validItems.length + invalidItems.length} tags parsed
                </Typography>

                {payload && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={
                      submitting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <SendIcon />
                      )
                    }
                    onClick={handleSubmit}
                    disabled={submitting || !payload}
                  >
                    {submitting ? "Submitting…" : "Submit to API"}
                  </Button>
                )}
              </Box>

              {/* Invalid Tags */}
              {invalidItems.length > 0 && (
                <Box
                  sx={{
                    mx: 3,
                    mt: 2,
                    p: 1.5,
                    borderLeft: "4px solid",
                    borderLeftColor: "error.main",
                    bgcolor: "#fff8f8",
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="subtitle2" color="error.main" sx={{ mb: 0.5 }}>
                    Invalid Tags ({invalidItems.length})
                  </Typography>
                  <Stack spacing={0.5}>
                    {invalidItems.map((item, i) => (
                      <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        ✕ {item.error}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Valid Items Table */}
              {validItems.length > 0 && (
                <Box sx={{ flex: 1, mx: 3, mt: 2, mb: 2, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    VALID TAGS — REVIEW BEFORE SUBMISSION
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ flex: 1, overflow: "auto" }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 50 }}>#</TableCell>
                          <TableCell>RFID Tag</TableCell>
                          <TableCell>Item ID</TableCell>
                          <TableCell>Product Name</TableCell>
                          <TableCell>Code</TableCell>
                          <TableCell>Product ID</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {validItems.map((item, i) => (
                          <TableRow key={i} hover>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell
                              sx={{ fontFamily: "monospace", fontWeight: 600, letterSpacing: 0.5 }}
                            >
                              {item.tag}
                            </TableCell>
                            <TableCell>{item.inventoryItemId}</TableCell>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>
                              <Chip
                                label={item.productCode}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            </TableCell>
                            <TableCell sx={{ color: "text.secondary" }}>
                              {item.productId}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {validItems.length === 0 && invalidItems.length === 0 && (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography color="text.disabled">No tags to display</Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* ===== BOTTOM PANEL — API Response ===== */}
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
        message="JSON copied to clipboard"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
