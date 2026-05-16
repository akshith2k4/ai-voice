import React, { useEffect, useMemo, useState, useCallback } from "react";
import { fetchDashboardData } from "../../utils/dashboardData";
import { Box, Paper, Typography, IconButton, Stack, Divider, Tooltip, Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import RefreshIcon from "@mui/icons-material/Refresh";
import TodayIcon from "@mui/icons-material/Today";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
// Removed unused icons; kept only icons used in this file
import { format, startOfDay, endOfDay, subDays } from "date-fns";

// ---------- Helpers ----------
const A = (x) => (Array.isArray(x) ? x : []);

const filterZeroSeries = (xCategories, seriesData) => {
    const filtered = xCategories
        .map((label, idx) => ({ label, value: Number(seriesData?.[idx] ?? 0) }))
        .filter((p) => p.value > 0);
    return {
        x: filtered.map((p) => p.label),
        y: filtered.map((p) => p.value),
        isEmpty: filtered.length === 0,
    };
};

// ---------- Micro components (extracted) ----------
import Section from "./Section";
import MetricCard from "./MetricCard";
import ChartCard from "./ChartCard";
import LoaderScreen from "./LoaderScreen";
import ErrorState from "./ErrorState";

// ---------- Main ----------
export default function Dashboard() {
    const theme = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    // UI filters (extend as needed)
    const [range, setRange] = useState("today"); // today | yesterday | 7d | 30d | custom
    const [startDate, setStartDate] = useState(null); // Date | null
    const [endDate, setEndDate] = useState(null); // Date | null

    // Apply preset ranges and keep pickers in sync
    const applyPreset = useCallback((preset) => {
        const now = new Date();
        let s = null;
        let e = null;
        if (preset === "today") {
            s = new Date(now);
            e = new Date(now);
        } else if (preset === "yesterday") {
            s = subDays(now, 1);
            e = subDays(now, 1);
        } else if (preset === "7d") {
            s = subDays(now, 6);
            e = new Date(now);
        } else if (preset === "30d") {
            s = subDays(now, 29);
            e = new Date(now);
        }
        setRange(preset);
        setStartDate(s);
        setEndDate(e);
    }, []);

    const computeRange = useCallback(() => {
        const now = new Date();
        if (range === "today") {
            return { start: startOfDay(now), end: endOfDay(now) };
        }
        if (range === "yesterday") {
            const y = subDays(now, 1);
            return { start: startOfDay(y), end: endOfDay(y) };
        }
        if (range === "7d") {
            return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
        }
        if (range === "30d") {
            return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
        }
        // custom
        if (startDate && endDate) {
            const s = startOfDay(startDate);
            const e = endOfDay(endDate);
            // Ensure proper order
            return s <= e ? { start: s, end: e } : { start: e, end: s };
        }
        // Fallback to today if custom incomplete
        return { start: startOfDay(now), end: endOfDay(now) };
    }, [range, startDate, endDate]);

    const load = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const { start, end } = computeRange();
            const d = await fetchDashboardData({ start, end });
            setData(d);
        } catch (e) {
            setErr(e);
        } finally {
            setLoading(false);
        }
    }, [computeRange]);

    useEffect(() => {
        // initial and subsequent loads when filters change
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range, startDate, endDate]);

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "r") load();
            if (e.key.toLowerCase() === "g") {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [load]);

    const headerActions = (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ flexWrap: "wrap" }}
        >
            {/* Date range (custom) using MUI X Date Pickers */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <DatePicker
                        label="Start"
                        value={startDate}
                        onChange={(v) => {
                            setRange("custom");
                            setStartDate(v);
                        }}
                        slotProps={{ textField: { size: "small" } }}
                    />
                    <DatePicker
                        label="End"
                        value={endDate}
                        onChange={(v) => {
                            setRange("custom");
                            setEndDate(v);
                        }}
                        slotProps={{ textField: { size: "small" } }}
                    />
                </Stack>
            </LocalizationProvider>

            <Stack direction="row" spacing={1}>
                <Chip
                    icon={<TodayIcon />}
                    variant={range === "today" ? "filled" : "outlined"}
                    color={range === "today" ? "primary" : "default"}
                    size="small"
                    label="Today"
                    onClick={() => applyPreset("today")}
                />
                <Chip
                    icon={<TodayIcon />}
                    variant={range === "yesterday" ? "filled" : "outlined"}
                    color={range === "yesterday" ? "primary" : "default"}
                    size="small"
                    label="Yesterday"
                    onClick={() => applyPreset("yesterday")}
                />
                <Chip
                    icon={<CalendarMonthIcon />}
                    variant={range === "7d" ? "filled" : "outlined"}
                    color={range === "7d" ? "primary" : "default"}
                    size="small"
                    label="Last 7d"
                    onClick={() => applyPreset("7d")}
                />
                {/* <Chip
                    icon={<CalendarMonthIcon />}
                    variant={range === "30d" ? "filled" : "outlined"}
                    color={range === "30d" ? "primary" : "default"}
                    size="small"
                    label="Last 30d"
                    onClick={() => applyPreset("30d")}
                /> */}
            </Stack>

            <Tooltip title="Refresh (r)">
                <IconButton onClick={load} aria-label="Refresh dashboard">
                    <RefreshIcon />
                </IconButton>
            </Tooltip>
            {/* <Tooltip title="Go to top (g)">
                <IconButton
                    onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    aria-label="Go to top"
                >
                    <ArrowUpwardIcon />
                </IconButton>
            </Tooltip> */}
        </Stack>
    );

    // Recompute filtered chart data only when data changes
    const charts = useMemo(() => {
        if (!data) return null;
        const x = A(data?.charts?.xCategories);

        const delivered = filterZeroSeries(x, data?.charts?.deliveredSeries);
        const picked = filterZeroSeries(x, data?.charts?.pickedSeries);
        const washSent = filterZeroSeries(x, data?.charts?.washSentSeries);
        const washDelivered = filterZeroSeries(
            x,
            data?.charts?.washDeliveredSeries
        );

        return { delivered, picked, washSent, washDelivered };
    }, [data]);

    // Loading screen
    if (loading && !data) return <LoaderScreen />;
    if (err && !data) return <ErrorState error={err} />;
    if (!data)
        return (
            <Box p={2}>
                <Typography variant="h6">Dashboard</Typography>
                <Typography color="text.secondary" mt={1}>
                    No data available. Please check network, authentication, or
                    try again later.
                </Typography>
            </Box>
        );

    return (
        <Box p={2} sx={{ display: "block", maxWidth: 1440, mx: "auto" }}>
            {/* Pinned header */}
            <Paper
                elevation={0}
                sx={{
                    position: "relative",
                    top: 0,
                    zIndex: 1,
                    backdropFilter: "saturate(180%) blur(8px)",
                    background: (t) =>
                        t.palette.mode === "dark" ? "#0b0b0bcc" : "#ffffffcc",
                    border: (t) => `1px solid ${t.palette.divider}`,
                    px: 2,
                    py: 1.25,
                    mb: 2,
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={1}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <FilterAltOutlinedIcon
                            fontSize="small"
                            sx={{ opacity: 0.6 }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Overview
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ ml: 0.5 }}
                        >
                            {(() => {
                                const { start, end } = computeRange();
                                const sameDay =
                                    start.toDateString() === end.toDateString();
                                return sameDay
                                    ? format(start, "EEE, MMM d")
                                    : `${format(
                                          start,
                                          "EEE, MMM d"
                                      )} – ${format(end, "EEE, MMM d")}`;
                            })()}
                        </Typography>
                    </Stack>
                    {headerActions}
                </Stack>
            </Paper>

            {/* KPI row */}
            <Section title="Order Stats">
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2, // 16px similar to spacing={2}
                        mb: 1,
                    }}
                >
                    {[
                        {
                            label: "Hotels",
                            value: data.cards?.hotels,
                            color: theme.palette.primary.main,
                        },
                        {
                            label: "Orders",
                            value: data.cards?.orders,
                            color: theme.palette.info.main,
                        },
                        {
                            label: "Items Picked",
                            value: data.cards?.itemsPicked,
                            color: theme.palette.success.main,
                        },
                        {
                            label: "Items Delivered",
                            value: data.cards?.itemsDelivered,
                            color: theme.palette.secondary.main,
                        },
                    ].map((c) => (
                        <Box
                            key={c.label}
                            sx={{
                                flexGrow: 0,
                                flexShrink: 0,
                                flexBasis: {
                                    xs: "100%",
                                    sm: "calc((100% - 16px) / 2)", // 2 cols with 16px gap
                                    md: "calc((100% - (3 * 16px)) / 4)", // 4 cols with 3 gaps
                                },
                            }}
                        >
                            <MetricCard
                                label={c.label}
                                value={c.value}
                                accent={c.color}
                            />
                        </Box>
                    ))}
                </Box>
            </Section>

            <Divider sx={{ my: 2 }} />

            {/* Orders & Deliveries */}
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4, // 32px similar to spacing={4}
                }}
            >
                <Box
                    sx={{
                        flexGrow: 0,
                        flexShrink: 0,
                        flexBasis: { xs: "100%", md: "calc((100% - 32px) / 2)" },
                    }}
                >
                    <ChartCard
                        title="Items Delivered"
                        subtitle="By category"
                        isLoading={loading}
                        isEmpty={charts?.delivered.isEmpty}
                    >
                        {!charts?.delivered.isEmpty && (
                            <BarChart
                                xAxis={[
                                    {
                                        scaleType: "band",
                                        data: charts.delivered.x,
                                    },
                                ]}
                                series={[
                                    {
                                        data: charts.delivered.y,
                                        color: theme.palette.primary.main,
                                    },
                                ]}
                                height={260}
                            />
                        )}
                    </ChartCard>
                </Box>

                <Box
                    sx={{
                        flexGrow: 0,
                        flexShrink: 0,
                        flexBasis: { xs: "100%", md: "calc((100% - 32px) / 2)" },
                    }}
                >
                    <ChartCard
                        title="Items Picked"
                        subtitle="By category"
                        isLoading={loading}
                        isEmpty={charts?.picked.isEmpty}
                    >
                        {!charts?.picked.isEmpty && (
                            <BarChart
                                xAxis={[
                                    {
                                        scaleType: "band",
                                        data: charts.picked.x,
                                    },
                                ]}
                                series={[
                                    {
                                        data: charts.picked.y,
                                        color: theme.palette.success.main,
                                    },
                                ]}
                                height={260}
                            />
                        )}
                    </ChartCard>
                </Box>
            </Box>

            {/* Wash section */}
            <Section title="Wash Stats" sx={{ mt: 3, mb: 2 }}>
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        mt: 0.5,
                    }}
                >
                    {[
                        {
                            label: "Laundries",
                            value: data.washCards?.laundries,
                            color: theme.palette.info.main,
                        },
                        {
                            label: "Items Sent",
                            value: data.washCards?.itemsSentToLaundry,
                            color: theme.palette.secondary.main,
                        },
                        {
                            label: "Items Delivered",
                            value: data.washCards?.itemsReceivedFromLaundry,
                            color: theme.palette.success.main,
                        },
                    ].map((c) => (
                        <Box
                            key={c.label}
                            sx={{
                                flexGrow: 0,
                                flexShrink: 0,
                                flexBasis: {
                                    xs: "100%",
                                    sm: "calc((100% - 16px) / 2)", // 2 cols, 1 gap
                                    md: "calc((100% - (2 * 16px)) / 3)", // 3 cols, 2 gaps
                                },
                            }}
                        >
                            <MetricCard
                                label={c.label}
                                value={c.value}
                                accent={c.color}
                            />
                        </Box>
                    ))}
                </Box>
            </Section>
            <Divider sx={{ mb: 2 }} />

            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    mt: 1,
                }}
            >
                <Box
                    sx={{
                        flexGrow: 0,
                        flexShrink: 0,
                        flexBasis: { xs: "100%", md: "calc((100% - 32px) / 2)" },
                    }}
                >
                    <ChartCard
                        title="Wash – Items Sent"
                        subtitle="By category"
                        isLoading={loading}
                        isEmpty={charts?.washSent.isEmpty}
                    >
                        {!charts?.washSent.isEmpty && (
                            <BarChart
                                xAxis={[
                                    {
                                        scaleType: "band",
                                        data: charts.washSent.x,
                                    },
                                ]}
                                series={[
                                    {
                                        data: charts.washSent.y,
                                        color: theme.palette.secondary.main,
                                    },
                                ]}
                                height={260}
                            />
                        )}
                    </ChartCard>
                </Box>
                <Box
                    sx={{
                        flexGrow: 0,
                        flexShrink: 0,
                        flexBasis: { xs: "100%", md: "calc((100% - 32px) / 2)" },
                    }}
                >
                    <ChartCard
                        title="Wash – Items Delivered"
                        subtitle="By category"
                        isLoading={loading}
                        isEmpty={charts?.washDelivered.isEmpty}
                    >
                        {!charts?.washDelivered.isEmpty && (
                            <BarChart
                                xAxis={[
                                    {
                                        scaleType: "band",
                                        data: charts.washDelivered.x,
                                    },
                                ]}
                                series={[
                                    {
                                        data: charts.washDelivered.y,
                                        color: theme.palette.success.main,
                                    },
                                ]}
                                height={260}
                            />
                        )}
                    </ChartCard>
                </Box>
            </Box>

            {/* Footer actions */}
            {/* <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button startIcon={<RefreshIcon />} onClick={load} variant="outlined">
          Refresh
        </Button>
      </Stack> */}
        </Box>
    );
}
