import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Chip,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
} from "@mui/material";
import { BarChart, PieChart } from "@mui/x-charts";
import BarChartIcon from "@mui/icons-material/BarChart";
import ErrorIcon from "@mui/icons-material/Error";

import { washRequestService } from "../../services/washRequestService";
import { buildPendingItemsIndex } from "../../utils/pendingItemsTransformer";
import { getProductColor } from "../../utils/productColorRegistry";

export default function PendingItemsDashboard() {
  const [pendingIndex, setPendingIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedPool, setSelectedPool] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingSummary, setPendingSummary] = useState({
    totalPending: 0,
    agedPending: 0,
  });

  /* ================= HELPERS ================= */

  const buildSearchPayload = () => {
    const toDateOnly = (d) => d.toISOString().slice(0, 10);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    return {
      startTime: toDateOnly(start),
      endTime: toDateOnly(end),
      filterType: "CREATED_TIME",
      status: "PENDING",
    };
  };

  const calculatePendingSummary = (pendingWashRequests) => {
    let totalPending = 0;
    let agedPending = 0;
    const today = new Date();

    pendingWashRequests.forEach((wr) => {
      const requestDate = new Date(wr.washRequestRecordedDate);
      const diffInDays =
        (today - requestDate) / (1000 * 60 * 60 * 24);

      wr.productSoiledItems.forEach((item) => {
        const pending =
          Number(item.soiledQuantity || 0) -
          Number(item.washedQuantity || 0);

        if (pending > 0) {
          totalPending += pending;
          if (diffInDays > 1) agedPending += pending;
        }
      });
    });

    return { totalPending, agedPending };
  };

  /* ================= FETCH + TRANSFORM ONCE ================= */

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await washRequestService.search(buildSearchPayload());
        const washRequests = Array.isArray(data) ? data : [];

        setPendingIndex(buildPendingItemsIndex(washRequests));
        setPendingSummary(calculatePendingSummary(washRequests));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ================= DERIVED LISTS ================= */

  const vendors = useMemo(() => {
    if (!pendingIndex) return [];
    return Object.values(pendingIndex.byVendorPool).map(
      (v) => v.vendor
    );
  }, [pendingIndex]);

  const pools = useMemo(() => {
    if (!pendingIndex || !selectedVendor) return [];
    return Object.values(
      pendingIndex.byVendorPool[selectedVendor]?.pools ?? {}
    ).map((p) => p.pool);
  }, [pendingIndex, selectedVendor]);

  /* ================= DEFAULT SELECTION ================= */

  useEffect(() => {
    if (!vendors.length) return;
    setSelectedVendor((v) => v || vendors[0].id);
  }, [vendors]);

  useEffect(() => {
    if (!pools.length) return;
    setSelectedPool((p) => p || pools[0].id);
  }, [pools]);

  /* ================= O(1) LOOKUP ================= */

  const pendingData = useMemo(() => {
    if (!pendingIndex || !selectedVendor || !selectedPool) return null;

    const poolNode =
      pendingIndex.byVendorPool[selectedVendor]?.pools[selectedPool];

    if (!poolNode) return null;

    return {
      vendor: pendingIndex.byVendorPool[selectedVendor].vendor,
      pool: poolNode.pool,
      products: poolNode.products,
      poolTotalPending: poolNode.poolTotalPending,
      dateRange: pendingIndex.dateRange,
    };
  }, [pendingIndex, selectedVendor, selectedPool]);

  /* ================= CHART DATA ================= */

  const dates = pendingData?.dateRange ?? [];

  const barSeries = useMemo(
    () =>
      pendingData
        ? pendingData.products.map((p) => ({
            label: p.productName,
            data: dates.map((d) => p.pendingByDate[d] ?? 0),
            stack: "total",
            color: getProductColor(p.productId),
          }))
        : [],
    [pendingData, dates]
  );

  const donutData = useMemo(
    () =>
      pendingData
        ? pendingData.products.map((p) => ({
            id: p.productId,
            value: p.totalPending,
            label: p.productName,
            color: getProductColor(p.productId),
          }))
        : [],
    [pendingData]
  );

  if (pendingSummary.totalPending === 0) return null;

  if (loading) {
    return (
      <Card sx={{ p: 2, mb: 2 }}>
        <CircularProgress size={20} />
      </Card>
    );
  }

  /* ================= UI ================= */

  return (
    <>
      {/* ================= STRIP ================= */}
      <Card
        sx={{
          mb: 2,
          p: 1,
          borderRadius: 2,
          backgroundColor: "#FFF7ED",
          border: "1px solid #FED7AA",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <ErrorIcon sx={{ color: "#f88800" }} />

          <Typography fontWeight={600}>
            {pendingSummary.totalPending} pending items from laundries
          </Typography>

          <Chip
            size="small"
            label={`pending for more than one day : ${pendingSummary.agedPending}`}
            color="warning"
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        <Button
          color="black"
          onClick={() => setDialogOpen(true)}
          sx={{ fontWeight: 700, gap: 1 }}
        >
          View More <BarChartIcon sx={{ color: "#ED6C02" }} />
        </Button>
      </Card>

      {/* ================= DIALOG ================= */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Pending Items – Last 7 Days</DialogTitle>

        <DialogContent>
          <Card sx={{ p: 3, borderRadius: 3 }}>
            {/* KPI */}
            
<Stack direction="row" spacing={2} mb={3}>
  <Card sx={{ p: 2, flex: 1 }}>
    <Typography variant="caption">Pool Total Pending</Typography>
    <Typography variant="h5" fontWeight={700}>
      {pendingData?.poolTotalPending ?? 0}
    </Typography>
  </Card>

  <Card sx={{ p: 2, flex: 1 }}>
    <Typography variant="caption">Products Pending</Typography>
    <Typography variant="h5" fontWeight={700}>
      {pendingData?.products?.length ?? 0}
    </Typography>
  </Card>

  <Card sx={{ p: 2, flex: 2 }}>
    <Typography variant="caption">Context</Typography>
    <Typography fontWeight={600}>
      {pendingData?.vendor?.name ?? "—"} /{" "}
      {pendingData?.pool?.name ?? "—"}
    </Typography>
  </Card>
</Stack>


            {/* Filters */}
            <Stack direction="row" spacing={2} mb={3}>
              <TextField
                select
                size="small"
                label="Laundry Vendor"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
              >
                {vendors.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Inventory Pool"
                value={selectedPool}
                onChange={(e) => setSelectedPool(e.target.value)}
              >
                {pools.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Divider sx={{ mb: 3 }} />

            {!pendingData && (
            <Box
              sx={{
                py: 6,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="h6">
                No pending items for this Vendor / Pool
              </Typography>
              <Typography variant="body2">
                Please select a different combination
              </Typography>
            </Box>
          )}


            {/* Charts */}
            {pendingData && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              <Card sx={{ p: 2, flex: 2 }}>
                <BarChart
                  xAxis={[
                    {
                      scaleType: "band",
                      data: dates.map((d) =>
                        new Date(d).toLocaleDateString("en-GB")
                      ),
                    },
                  ]}
                  series={barSeries}
                  height={320}
                />
              </Card>

              <Card sx={{ p: 2, flex: 1 }}>
                <PieChart
                  series={[
                    {
                      data: donutData,
                      innerRadius: 60,
                      outerRadius: 100,
                    },
                  ]}
                  height={260}
                />
              </Card>
            </Stack>
            )}
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}
