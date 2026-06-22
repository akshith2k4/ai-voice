import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, IconButton, MenuItem, Stack, TextField } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import LoaderScreen from "../dashboard/LoaderScreen";
import { useWashAnalysis } from "../../hooks/useWashAnalysis";
import AnalysisSection from "../../utils/AnalysisSection";
import { buildWashAnalysisChartData } from "../../utils/washAnalysisChartData";
import { buildWashAnalysisSections } from "../../utils/washAnalysisSections";
import {
  calculateWashEfficiency,
  CLEAN_RECEIVED_SOURCE_OPTIONS,
  fulfillmentBreakdown,
  fulfillmentPoolNames,
  getFulfillmentAnalysisDate,
  isRewashType,
  matchesFulfillmentPool,
  matchesFulfillmentVendor,
  matchesPool,
  matchesVendor,
  requestPoolName,
  washRequestTotals,
} from "../../utils/washAnalysisUtils";

export default function WashAnalysis() {
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [granularity, setGranularity] = useState("WEEK");
  const [cleanReceivedSource] = useState(CLEAN_RECEIVED_SOURCE_OPTIONS.REQUEST);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedPool, setSelectedPool] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const {
    data: washAnalysisData,
    isLoading: loading,
    error: loadError,
  } = useWashAnalysis(monthDate);

  const washRequests = washAnalysisData?.washRequests ?? [];
  const washFulfillments = washAnalysisData?.washFulfillments ?? [];
  const error = loadError ? "Failed to load wash analysis." : "";

  const vendorOptions = useMemo(() => {
    const vendorMap = new Map();

    washRequests.forEach((item) => {
      const id = item?.laundryVendorId;
      if (id == null) return;
      vendorMap.set(String(id), {
        id: String(id),
        name: item?.laundryVendorName || `Vendor ${id}`,
      });
    });

    washFulfillments.forEach((item) => {
      const id = item?.vendorId ?? item?.laundryVendorId;
      if (id == null) return;
      vendorMap.set(String(id), {
        id: String(id),
        name: item?.vendorName || item?.laundryVendorName || `Vendor ${id}`,
      });
    });

    return Array.from(vendorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [washRequests, washFulfillments]);

  const poolOptions = useMemo(() => {
    const pools = new Set();

    washRequests.forEach((item) => {
      if (matchesVendor(item, selectedVendor) && requestPoolName(item)) {
        pools.add(requestPoolName(item));
      }
    });

    washFulfillments.forEach((item) => {
      if (matchesFulfillmentVendor(item, selectedVendor)) {
        fulfillmentPoolNames(item).forEach((pool) => pools.add(pool));
      }
    });

    return Array.from(pools).sort((a, b) => a.localeCompare(b));
  }, [selectedVendor, washRequests, washFulfillments]);

  const productOptions = useMemo(() => {
    const products = new Set();

    washRequests.forEach((item) => {
      if (!(matchesVendor(item, selectedVendor) && matchesPool(item, selectedPool))) return;
      (Array.isArray(item?.productSoiledItems) ? item.productSoiledItems : []).forEach((productItem) => {
        const productName = productItem?.productName?.trim();
        if (productName) products.add(productName);
      });
    });

    washFulfillments.forEach((item) => {
      if (!(matchesFulfillmentVendor(item, selectedVendor) && matchesFulfillmentPool(item, selectedPool))) return;
      (Array.isArray(item?.mappings) ? item.mappings : []).forEach((mapping) => {
        (Array.isArray(mapping?.productItems) ? mapping.productItems : []).forEach((productItem) => {
          const productName = productItem?.productName?.trim();
          if (productName) products.add(productName);
        });
      });
    });

    return Array.from(products).sort((a, b) => a.localeCompare(b));
  }, [selectedPool, selectedVendor, washFulfillments, washRequests]);

  useEffect(() => {
    if (selectedVendor && !vendorOptions.some((vendor) => vendor.id === selectedVendor)) {
      setSelectedVendor("");
    }
  }, [selectedVendor, vendorOptions]);

  useEffect(() => {
    if (selectedPool && !poolOptions.includes(selectedPool)) {
      setSelectedPool("");
    }
  }, [selectedPool, poolOptions]);

  useEffect(() => {
    if (selectedProduct && !productOptions.includes(selectedProduct)) {
      setSelectedProduct("");
    }
  }, [selectedProduct, productOptions]);

  const filteredRequests = useMemo(
    () => washRequests.filter((item) => matchesVendor(item, selectedVendor) && matchesPool(item, selectedPool)),
    [washRequests, selectedVendor, selectedPool]
  );

  const filteredFulfillments = useMemo(
    () =>
      washFulfillments.filter(
        (item) => matchesFulfillmentVendor(item, selectedVendor) && matchesFulfillmentPool(item, selectedPool)
      ),
    [washFulfillments, selectedVendor, selectedPool]
  );

  const requestTypeById = useMemo(() => {
    const map = new Map();
    washRequests.forEach((request) => {
      const id = request?.id ?? request?.washRequestId;
      if (id == null) return;
      map.set(String(id), request?.washRequestType);
    });
    return map;
  }, [washRequests]);

  const chartData = useMemo(
    () =>
      buildWashAnalysisChartData({
        monthDate,
        granularity,
        filteredRequests,
        filteredFulfillments,
        requestTypeById,
        selectedProduct,
        cleanReceivedSource,
        requestSourceValue: CLEAN_RECEIVED_SOURCE_OPTIONS.REQUEST,
        fulfillmentSourceValue: CLEAN_RECEIVED_SOURCE_OPTIONS.FULFILLMENT,
        requestTotals: washRequestTotals,
        fulfillmentBreakdown,
        calculateWashEfficiency,
        getFulfillmentAnalysisDate,
        isRewashType,
      }),
    [cleanReceivedSource, filteredFulfillments, filteredRequests, granularity, monthDate, requestTypeById, selectedProduct]
  );

  const analysisSections = useMemo(() => buildWashAnalysisSections(chartData), [chartData]);

  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 2.5, borderRadius: 3 }}>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Stack direction="row" spacing={1.75} alignItems="center" sx={{ flexWrap: "nowrap", minWidth: "max-content", pt: 1 }}>
            <IconButton
              aria-label="Previous month"
              onClick={() => setMonthDate((prev) => startOfMonth(subMonths(prev, 1)))}
              sx={{ border: "1px solid #d1d5db", borderRadius: 2 }}
            >
              <ChevronLeftIcon />
            </IconButton>

            <TextField
              select
              label="Month"
              value={format(monthDate, "yyyy-MM")}
              onChange={(event) => {
                const [year, month] = String(event.target.value).split("-").map(Number);
                setMonthDate(new Date(year, month - 1, 1));
              }}
              size="small"
              sx={{ minWidth: 150, mt: 0.5 }}
            >
              {[subMonths(monthDate, 2), subMonths(monthDate, 1), monthDate, addMonths(monthDate, 1), addMonths(monthDate, 2)].map(
                (date) => {
                  const value = format(startOfMonth(date), "yyyy-MM");
                  return (
                    <MenuItem key={value} value={value}>
                      {format(startOfMonth(date), "MMMM yyyy")}
                    </MenuItem>
                  );
                }
              )}
            </TextField>

            <IconButton
              aria-label="Next month"
              onClick={() => setMonthDate((prev) => startOfMonth(addMonths(prev, 1)))}
              sx={{ border: "1px solid #d1d5db", borderRadius: 2 }}
            >
              <ChevronRightIcon />
            </IconButton>

            <TextField
              select
              label="View"
              value={granularity}
              onChange={(event) => setGranularity(event.target.value)}
              size="small"
              sx={{ minWidth: 140, mt: 0.5 }}
            >
              <MenuItem value="WEEK">Week-wise</MenuItem>
              <MenuItem value="DAY">Day-wise</MenuItem>
            </TextField>

            <TextField
              select
              label="Vendor"
              value={selectedVendor}
              onChange={(event) => setSelectedVendor(event.target.value)}
              size="small"
              sx={{ minWidth: 180, mt: 0.5 }}
            >
              <MenuItem value="">All Vendors</MenuItem>
              {vendorOptions.map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Pool"
              value={selectedPool}
              onChange={(event) => setSelectedPool(event.target.value)}
              size="small"
              sx={{ minWidth: 180, mt: 0.5 }}
            >
              <MenuItem value="">All Pools</MenuItem>
              {poolOptions.map((pool) => (
                <MenuItem key={pool} value={pool}>
                  {pool}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Product"
              value={selectedProduct}
              onChange={(event) => setSelectedProduct(event.target.value)}
              size="small"
              sx={{ minWidth: 180, mt: 0.5 }}
            >
              <MenuItem value="">All Products</MenuItem>
              {productOptions.map((product) => (
                <MenuItem key={product} value={product}>
                  {product}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>
      </Card>

      {loading ? (
        <Card sx={{ p: 2, borderRadius: 3 }}>
          <LoaderScreen />
        </Card>
      ) : (
        <Stack spacing={2.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {analysisSections.map((section) => (
            <AnalysisSection
              key={section.title}
              title={section.title}
              metrics={section.metrics}
              xAxis={chartData.xAxis}
              xAxisValueFormatter={section.xAxisValueFormatter}
              series={section.series}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
