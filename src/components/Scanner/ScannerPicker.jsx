import { useState, useEffect, useRef, useCallback } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";

import { scannerService } from "../../services/scannerService";
import { scannerController } from "./ScannerController";

const ScannerPicker = ({
  quantityType,
  referenceId,
  productId,
  scanType,
  disabled = false,
  onScanStart,
  onScanStop,
  onScanMessage,
  onError,
  showDot,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [readers, setReaders] = useState([]);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const onScanMessageRef = useRef(onScanMessage);
  const onScanStopRef = useRef(onScanStop);

  const open = Boolean(anchorEl);

  useEffect(() => {
    onScanMessageRef.current = onScanMessage;
  }, [onScanMessage]);

  useEffect(() => {
    onScanStopRef.current = onScanStop;
  }, [onScanStop]);

  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        if (!scannerController.hasActiveSession()) {
          setIsActive(false);
          onScanStopRef.current?.();
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const forwardSessionMessage = useCallback((data) => {
    console.log("📨 ScannerPicker received data:", data);
    console.log("   Forwarding to parent callback...");
    if (onScanMessageRef.current) {
      onScanMessageRef.current(data);
      console.log("   ✅ Forwarded to parent");
    } else {
      console.warn("   ⚠️ onScanMessage callback not provided!");
    }
  }, []);

  const loadReaders = async () => {
    setLoadingReaders(true);
    try {
      const data = await scannerService.getAllReaders();
      setReaders(Array.isArray(data) ? data : []);
    } catch (err) {
      setReaders([]);
      onError?.(err);
    } finally {
      setLoadingReaders(false);
    }
  };

  const handleWifiClick = async (event) => {
    if (disabled || loadingAction) return;

    if (isActive) {
      try {
        setLoadingAction(true);
        await scannerController.stop();
        setIsActive(false);
        onScanStop?.();
        onScanMessage?.({
          type: "INFO",
          message: "Scan stopped",
        });
      } catch (err) {
        onError?.(err);
      } finally {
        setLoadingAction(false);
      }
      return;
    }

    setAnchorEl(event.currentTarget);
    loadReaders();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAddScanner = async () => {
    try {
      const readerId = prompt("Enter Reader ID");
      if (!readerId) return;

      const name = prompt("Enter Scanner Name");
      if (!name) return;

      await scannerService.createReader({
        readerId,
        name,
        readerType: "RFID",
      });

      await loadReaders();
    } catch (err) {
      onError?.(err);
    }
  };

  const handleReaderSelect = async (reader) => {
    setAnchorEl(null);
    setLoadingAction(true);

    console.log("🎯 Scanner selected:", reader.readerId);
    console.log("   Callback present:", !!onScanMessage);

    try {
      if (scannerController.hasActiveSession()) {
        await scannerController.stop();
      }

      const sessionId = await scannerController.start({
        readerId: reader.readerId,
        referenceId,
        quantityType,
        scanType,
        onSessionMessage: forwardSessionMessage,
      });

      setIsActive(true);
      console.log("✅ Scanner started with session:", sessionId);

      onScanStart?.({
        quantityType,
        referenceId,
        productId,
        sessionId,
        readerId: reader.readerId,
      });
    } catch (err) {
      console.error("❌ Scanner start error:", err);
      onError?.(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteReader = async (readerId, e) => {
    e.stopPropagation();
    try {
      setDeletingId(readerId);
      await scannerService.deleteReader(readerId);
      setReaders((prev) => prev.filter((r) => r.id !== readerId));
    } catch (err) {
      onError?.(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <IconButton
          size="small"
          onClick={handleWifiClick}
          disabled={disabled || loadingAction}
          sx={{
            color: isActive ? "#16A34A" : "text.primary",
            bgcolor: isActive ? "rgba(22,163,74,0.12)" : "transparent",
          }}
        >
          {loadingAction ? (
            <CircularProgress size={18} />
          ) : (
            <WifiIcon fontSize="small" />
          )}
        </IconButton>

        {isActive && showDot && (
          <Box
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#16A34A",
              animation: "scanBlink 1s infinite",
              "@keyframes scanBlink": {
                "0%": { opacity: 1 },
                "50%": { opacity: 0.2 },
                "100%": { opacity: 1 },
              },
            }}
          />
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 300,
            borderRadius: 2,
            boxShadow: 3,
            py: 0.5,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1,
          }}
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: 13,
              color: "text.primary",
            }}
          >
            Scanners
          </Typography>
        </Box>

        <Divider />

        {loadingReaders && (
          <MenuItem disabled>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} />
              <Typography>Loading scanners</Typography>
            </Box>
          </MenuItem>
        )}

        {!loadingReaders && readers.length === 0 && (
          <MenuItem disabled>
            <Typography>No scanners available</Typography>
          </MenuItem>
        )}

        {!loadingReaders &&
          readers.map((reader) => (
            <MenuItem
              key={reader.id}
              onClick={() => handleReaderSelect(reader)}
              sx={{
                px: 2,
                py: 1.25,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "text.primary",
                    lineHeight: 1.2,
                  }}
                >
                  {reader.name}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12,
                    color: "text.secondary",
                  }}
                >
                  {reader.readerId}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor:
                      reader.status === "ONLINE"
                        ? "#16A34A"
                        : reader.status === "SCANNING"
                          ? "#F59E0B"
                          : "#E5E7EB",
                  }}
                />
              </Box>
            </MenuItem>
          ))}
      </Menu>
    </>
  );
};

export default ScannerPicker;
