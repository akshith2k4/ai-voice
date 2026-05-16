// src/components/layout/WarehousePill.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  ButtonBase,
  Menu,
  MenuItem,
  ListItemText,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import WarehouseIcon from "@mui/icons-material/StoreMallDirectory";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useDcid } from "../../context/DcidContext.jsx";
import apiService from "../../services/apiService.jsx";

function getId(w) {
  return w?.id ?? w?.dcId ?? w?.dc_id ?? w?.warehouseId ?? null;
}
function getCode(w) {
  return (
    w?.code || w?.dcCode || w?.warehouseCode || w?.shortCode || w?.abbr || null
  );
}
function getDisplayName(w) {
  return (
    w?.name ||
    w?.dcName ||
    w?.warehouseName ||
    w?.title ||
    (getId(w) ? `Warehouse ${getId(w)}` : "")
  );
}

export default function WarehousePill({
  sx,
  compact = false,
  pillMode = "code-name",
  fullWidth = false,
}) {
  const { dcid, setDcid, requireWarehouse, setRequireWarehouse } = useDcid();
  const [anchorEl, setAnchorEl] = useState(null);
  const [triggerWidth, setTriggerWidth] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchorEl);
  const autocloseafterLockOverlay = useRef(false);
  useEffect(() => {
    if (autocloseafterLockOverlay.current) {
      autocloseafterLockOverlay.current = false; // reset after skip
      return;
    }
    if (requireWarehouse && !dcid) {
      const pill = document.querySelector('[aria-label="Select warehouse"]');
      if (pill) {
        setAnchorEl(pill);
        setTriggerWidth(pill.offsetWidth || 280);
      }
    }
  }, [requireWarehouse]); // remove dcid & open from deps

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiService.get("/dc/fetch-all");
        const payload = res?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.records)
          ? payload.records
          : Array.isArray(payload?.content)
          ? payload.content
          : [];
        if (active) setWarehouses(list);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const current = useMemo(() => {
    if (!dcid) return null;
    return warehouses.find((w) => String(getId(w)) === String(dcid)) || null;
  }, [dcid, warehouses]);

  const name = current ? getDisplayName(current) : "All Warehouses";
  const code = current ? getCode(current) : null;

  const sorted = useMemo(() => {
    return warehouses.slice().sort((a, b) => {
      const as = String(getId(a)) === String(dcid) ? -1 : 0;
      const bs = String(getId(b)) === String(dcid) ? -1 : 0;
      return as - bs;
    });
  }, [warehouses, dcid]);

  const handleChoose = (val) => {
    autocloseafterLockOverlay.current = true;
    setAnchorEl(null); //  close immediately
    setRequireWarehouse(false);
    setDcid(val || null);
  };

  return (
    <>
      <Tooltip
        title={
          requireWarehouse
            ? "Warehouse required"
            : current
            ? `${code ? `${String(code).toUpperCase()} • ` : ""}${name}`
            : "All Warehouses"
        }
        placement="bottom"
        disableHoverListener={requireWarehouse}
        disableFocusListener={requireWarehouse}
        disableTouchListener={requireWarehouse}
      >
        <ButtonBase
          aria-label="Select warehouse"
          onClick={(e) => {
            setAnchorEl(e.currentTarget);
            setTriggerWidth(e.currentTarget?.offsetWidth || 0);
          }}
          sx={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: compact ? 0.5 : 0.75,
            height: compact ? 28 : 40,
            px: compact ? 1 : 1.25,
            borderRadius: 999,
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.28)",
            backgroundColor: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(3px)",
            whiteSpace: "nowrap",
            width: fullWidth ? "100%" : undefined,
            maxWidth: fullWidth
              ? "none"
              : pillMode === "code-only"
              ? 120
              : compact
              ? 220
              : 260,
            overflow: "hidden",
            "&:hover": {
              borderColor: "rgba(255,255,255,0.5)",
              backgroundColor: "rgba(255,255,255,0.16)",
            },
            ...sx,
            zIndex: requireWarehouse
              ? (theme) => theme.zIndex.modal + 2
              : "auto",
            boxShadow: requireWarehouse
              ? "0 0 0 3px rgba(102,187,106,0.9), 0 0 28px rgba(102,187,106,0.6)"
              : undefined,
            animation: requireWarehouse
              ? "warehousePulse 1.4s infinite"
              : "none",
          }}
        >
          <WarehouseIcon sx={{ fontSize: compact ? 20 : 24, ml: 0.5 }} />
          {!compact && (
            <Box
              component="span"
              sx={{
                // fontSize: "0.78rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                ml: 0.75,
                maxWidth: fullWidth ? "unset" : 160,
                flex: fullWidth ? 1 : undefined,
                textTransform: current && code ? "uppercase" : "none",
                fontWeight: 800,
              }}
            >
              {current ? (code ? String(code) : name) : "All"}
            </Box>
          )}
          <KeyboardArrowDownIcon
            sx={{ fontSize: compact ? 15 : 17, opacity: 0.98, ml: 0.25 }}
          />
        </ButtonBase>
      </Tooltip>

      <Menu
        open={open}
        anchorEl={anchorEl}
        onClose={(event, reason) => {
          // ⛔ Block auto-close when warehouse selection is mandatory
          if (requireWarehouse && reason !== "selectOption") {
            return;
          }

          setAnchorEl(null);
        }}
        keepMounted
        transformOrigin={{ horizontal: "center", vertical: "top" }}
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 0.6,
            width: triggerWidth || 280,
            minWidth: triggerWidth || 280,
            maxWidth: triggerWidth || 280,
            maxHeight: 380,
            borderRadius: 1,
            overflow: "auto",
            bgcolor: "#163d1b",
            backgroundImage: "none",
            backdropFilter: "none",
            opacity: 1,
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 8px 16px rgba(0,0,0,0.18)",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -6,
              left: "50%",
              width: 10,
              height: 10,
              bgcolor: "#163d1b",
              borderLeft: "1px solid rgba(255,255,255,0.2)",
              borderTop: "1px solid rgba(255,255,255,0.2)",
              transform: "translateX(-50%) rotate(45deg)",
            },
          },
          elevation: 0,
        }}
        MenuListProps={{
          sx: {
            py: 0.25,
            bgcolor: "#163d1b",
            "& .MuiMenuItem-root": {
              px: 1,
              py: 0.55,
              minHeight: 34,
              gap: 0.5,
              bgcolor: "transparent",
            },
            "& .MuiMenuItem-root + .MuiMenuItem-root": {
              borderTop: 1,
              borderColor: "rgba(255,255,255,0.12)",
            },
            "& .MuiMenuItem-root .MuiListItemText-primary": { color: "#fff" },
            "& .MuiMenuItem-root .MuiListItemText-secondary": { color: "#fff" },
            "& .MuiMenuItem-root:hover": { bgcolor: "#1f4d2a" },
            "& .MuiMenuItem-root.Mui-selected": { bgcolor: "#1a3f23" },
          },
        }}
      >
        <MenuItem
          selected={!dcid}
          onClick={() => handleChoose("")}
          sx={{
            "&.Mui-selected::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: "#66bb6a",
              borderTopLeftRadius: 6,
              borderBottomLeftRadius: 6,
            },
          }}
        >
          <ListItemText
            primary="All Warehouses"
            primaryTypographyProps={{
              fontSize: "0.92rem",
              fontWeight: !dcid ? 700 : 500,
              sx: { color: "#fff" },
            }}
          />
          <CheckIcon
            sx={{
              ml: 1,
              fontSize: 18,
              color: !dcid ? "#66bb6a" : "transparent",
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.25, borderColor: "rgba(255,255,255,0.12)" }} />

        {loading && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 1.5,
            }}
          >
            <CircularProgress size={18} thickness={4} />
          </Box>
        )}

        {!loading && sorted.length === 0 && (
          <MenuItem disabled>
            <ListItemText
              primary="No warehouses"
              primaryTypographyProps={{ fontSize: "0.9rem", color: "#c8e6c9" }}
            />
          </MenuItem>
        )}

        {!loading &&
          sorted.map((w) => {
            const id = getId(w);
            const code = getCode(w);
            const display = getDisplayName(w);
            const selected = String(dcid) === String(id);

            return (
              <MenuItem
                key={id ?? Math.random()}
                onClick={() => handleChoose(id)}
                selected={selected}
                sx={{
                  "&.Mui-selected::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    backgroundColor: "#66bb6a",
                    borderTopLeftRadius: 6,
                    borderBottomLeftRadius: 6,
                  },
                }}
              >
                <ListItemText
                  primary={
                    code ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          minWidth: 0,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: "0.72rem",
                            px: 0.5,
                            py: "2px",
                            lineHeight: 1,
                            borderRadius: 0.75,
                            textTransform: "uppercase",
                            border: "1px solid rgba(255,255,255,0.28)",
                            bgcolor: "rgba(255,255,255,0.06)",
                            fontWeight: 600,
                            opacity: 1,
                            flexShrink: 0,
                          }}
                        >
                          {String(code).toUpperCase()}
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        component="span"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "#fff",
                        }}
                      >
                        {display}
                      </Box>
                    )
                  }
                  secondary={
                    code ? (
                      <Box
                        component="span"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "#fff",
                        }}
                      >
                        {display}
                      </Box>
                    ) : undefined
                  }
                  primaryTypographyProps={{
                    fontSize: "0.92rem",
                    fontWeight: selected ? 700 : 500,
                    sx: { color: "#fff" },
                  }}
                  secondaryTypographyProps={{
                    sx: { mt: 0.25, fontSize: "0.78rem", color: "#fff" },
                  }}
                />
                <CheckIcon
                  sx={{
                    ml: 1,
                    fontSize: 18,
                    color: selected ? "#66bb6a" : "transparent",
                  }}
                />
              </MenuItem>
            );
          })}
      </Menu>
    </>
  );
}
