import React, { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import { format, differenceInMinutes } from "date-fns";
import { parseDate } from "../../utils/dateUtils";

export default function TripTimelineDialog({ open, onClose, title, visits = [] }) {
  // Build events dynamically and format label as: "10.12 AM - Started Holiday INN"
  const events = useMemo(() => {
    const ev = [];
    (Array.isArray(visits) ? visits : []).forEach((v, idx) => {
      const name = v.customerName || v.visitName || v.locationName || `Visit ${idx + 1}`;
      if (v.startedAt) {
        const t = parseDate(v.startedAt);
        ev.push({
          id: `s-${idx}`,
          kind: "started",
          time: t,
          // formatted label: time - Started <name>
          text: `${format(t, "h.mm a")} - Started ${name}`,
        });
      }
      if (v.completedAt) {
        const t = parseDate(v.completedAt);
        ev.push({
          id: `c-${idx}`,
          kind: "completed",
          time: t,
          text: `${format(t, "h.mm a")} - Completed ${name}`,
        });
      }
    });
    ev.sort((a, b) => a.time - b.time);
    return ev;
  }, [visits]);

  const formatDuration = (minutes) => {
    if (minutes == null || Number.isNaN(minutes)) return "0 Min";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs} Hr${hrs > 1 ? "s" : ""} ${mins} Min`;
    return `${mins} Min`;
  };

  // Layout constants (tweakable)
  const LEFT_COL = 120; // px reserved for left gap labels (duration)
  const CENTER_COL = 40; // axis + circles
  const EVENT_ROW_HEIGHT = 64;
  const UNIFORM_GAP_PX = 40;
  const CIRCLE_SIZE = 16;
  const SHORT_CONN = 10;
  const CONNECTOR_COLOR = "grey.300";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold", fontSize: "1rem" }}>
        {title || "Visits Timeline"}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ p: 2, position: "relative", maxHeight: "70vh", overflowY: "auto" }}
      >
        <Box sx={{ position: "relative" }}>
          {events.length === 0 ? (
            <Typography>No visits / events found for this trip.</Typography>
          ) : (
            events.map((ev, i) => {
              const next = i < events.length - 1 ? events[i + 1] : null;
              const gapMinutes = next ? differenceInMinutes(next.time, ev.time) : null;
              const gapPx = UNIFORM_GAP_PX;

              const isCompleted = ev.kind === "completed";
              const isStarted = ev.kind === "started";

              return (
                <Box key={ev.id}>
                  {/* EVENT ROW */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `${LEFT_COL}px ${CENTER_COL}px 1fr`,
                      alignItems: "center",
                      gap: 0.5,
                      minHeight: `${EVENT_ROW_HEIGHT}px`,
                      py: 0.3,
                    }}
                  >
                    {/* LEFT: intentionally empty for visual spacing (duration shown between rows) */}
                    <Box sx={{ pr: 2 }} />

                    {/* CENTER: node + tiny connectors for adjacency */}
                    <Box sx={{ position: "relative", height: `${EVENT_ROW_HEIGHT}px` }}>
                      {i > 0 && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: "50%",
                            transform: "translateX(-1px)",
                            width: 2,
                            height: SHORT_CONN,
                            bgcolor: CONNECTOR_COLOR,
                          }}
                        />
                      )}

                      {i < events.length - 1 && (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-1px)",
                            width: 2,
                            height: SHORT_CONN,
                            bgcolor: CONNECTOR_COLOR,
                          }}
                        />
                      )}

                      <Box
                        sx={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: CIRCLE_SIZE,
                          height: CIRCLE_SIZE,
                          borderRadius: "50%",
                          bgcolor: isCompleted ? "success.main" : "background.paper",
                          border: isStarted ? "3px solid" : "2px solid",
                          borderColor: isStarted ? "primary.main" : "grey.400",
                          boxShadow: isCompleted ? "0 0 0 3px rgba(76,175,80,0.12)" : "none",
                        }}
                      />
                    </Box>

                    {/* RIGHT: event text (single-line: time + action + name) */}
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Box component="span">{ev.text}</Box>
                      </Typography>
                      <Divider sx={{ mt: 0.75, mb: 0.5 }} />
                    </Box>
                  </Box>

                  {/* GAP ROW: shown between this event and the next */}
                  {next && (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: `${LEFT_COL}px ${CENTER_COL}px 1fr`,
                        alignItems: "center",
                        gap: 0.5,
                        minHeight: `${gapPx}px`,
                      }}
                    >
                      {/* LEFT: duration chip (aligned center between events) */}
                      <Box
                        sx={{
                          pr: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Chip
                          size="small"
                          color="default"
                          variant="outlined"
                          label={formatDuration(gapMinutes)}
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            height: 22,
                            maxWidth: "100%",
                            whiteSpace: "nowrap",
                          }}
                        />
                      </Box>

                      {/* CENTER: full connector to bridge the gap */}
                      <Box sx={{ position: "relative", height: `${gapPx}px` }}>
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-1px)",
                            width: 2,
                            bgcolor: CONNECTOR_COLOR,
                          }}
                        />
                      </Box>

                      {/* RIGHT: small visual spacer (empty) */}
                      <Box />
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
