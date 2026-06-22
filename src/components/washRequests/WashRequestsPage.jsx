import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Tabs,
  Tab,
  Box,
  Stack,
  Card,
  Typography,
  Button,
  Chip,
} from "@mui/material";

import CustomSnackbar from "../layout/CustomSnackbar";

import WashRequestTabs from "./filters/WashRequestTabs";
import WashFulfillmentTabs from "./filters/WashFulfillmentTabs";

import WashRequestTable from "./tables/WashRequestTable";
import WashFulfillmentTable from "./tables/WashFulfillmentTable";
import WashRequestDrawer from "./drawers/WashRequestDrawer";
import WashFulfillmentDrawer from "./drawers/WashFulfillmentDrawer";
import FulfillmentDialog from "./dialogs/FulfillmentDialog";

import WRUnifiedDialog from "./dialogs/WRUnifiedDialog";

import { washRequestService } from "../../services/washRequestService";
import { washFulfillmentService } from "../../services/washFulfillmentService";
import { subDays } from "date-fns";
import PendingItemsDashboard from "./PendingItemsDashboard";
import WashAnalysis from "./WashAnalysis";

const DEFAULT_DATE_RANGE_DAYS = 3;

function WashRequestsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [washRequests, setWashRequests] = useState([]);
  const [washFulfillments, setWashFulfillments] = useState([]);

  const [filters, setFilters] = useState({
    // Default to the last 3 days range
    startTime: subDays(new Date(), DEFAULT_DATE_RANGE_DAYS).toISOString(),
    endTime: new Date().toISOString(),
    filterType: "CREATED_TIME",
    poolName:"",
  });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedFulfillment, setSelectedFulfillment] = useState(null);

  const [fulfillmentDialogOpen, setFulfillmentDialogOpen] = useState(false);

  // Unified create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState("wash"); // "wash" | "rewash"

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const getFilterPayload = useCallback(() => {
    const toDateOnly = (val) => {
      if (!val) return null;
      const d = new Date(val);
      if (isNaN(d)) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const payload = {
      startTime: toDateOnly(filters.startTime),
      endTime: toDateOnly(filters.endTime),
      filterType: filters.filterType,
    };
    if (filters.status) payload.status = filters.status;
    return payload;
  }, [filters]);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await washRequestService.search(getFilterPayload());
      setWashRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching wash requests:", err);
      handleSnackbar("Failed to load Wash Requests", "error");
    }
  }, [getFilterPayload, handleSnackbar]);

  const fetchFulfillments = useCallback(async () => {
    try {
      const data = await washFulfillmentService.search(
        filters.startTime,
        filters.endTime,
      );
      setWashFulfillments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching wash fulfillments:", err);
      handleSnackbar("Failed to load Wash Fulfillments", "error");
    }
  }, [filters.startTime, filters.endTime, handleSnackbar]);

  const reloadWashRequests = useCallback(async () => {
    try {
      const data = await washRequestService.search(getFilterPayload());
      setWashRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error reloading wash requests:", err);
      handleSnackbar("Failed to refresh Wash Requests", "error");
    }
  }, [getFilterPayload, handleSnackbar]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (tabIndex === 0) fetchRequests();
  }, [tabIndex, fetchRequests]);

  useEffect(() => {
    if (tabIndex === 1) fetchFulfillments();
  }, [tabIndex, fetchFulfillments]);

  // Unified create helpers
  const openCreateWash = () => {
    setCreateMode("wash");
    setCreateOpen(true);
  };
  const openCreateRewash = () => {
    setCreateMode("rewash");
    setCreateOpen(true);
  };
  const closeCreate = () => setCreateOpen(false);

  const getFulfillmentPoolNames = useCallback((fulfillment) => {
    if (!Array.isArray(fulfillment?.mappings)) return [];

    return Array.from(
      new Set(
        fulfillment.mappings
          .map((mapping) => mapping?.inventoryPoolName?.trim())
          .filter(Boolean),
      ),
    );
  }, []);

  const poolOptions = useMemo(() => {
    const names = washRequests
      .map((item) => item.referenceName?.trim())
      .filter(Boolean);

    return [...new Set(names)];
  }, [washRequests]);

  const filteredWashRequests = useMemo(() => {
    if (!filters.poolName) return washRequests;

    return washRequests.filter(
      (item) =>
        item.referenceName?.toLowerCase() === filters.poolName?.toLowerCase(),
    );
  }, [washRequests, filters.poolName]);

  const fulfillmentPoolOptions = useMemo(() => {
    return Array.from(
      new Set(washFulfillments.flatMap((item) => getFulfillmentPoolNames(item))),
    );
  }, [washFulfillments, getFulfillmentPoolNames]);

  const filteredWashFulfillments = useMemo(() => {
    if (!filters.poolName) return washFulfillments;

    const selectedPool = filters.poolName.toLowerCase();
    return washFulfillments.filter((item) =>
      getFulfillmentPoolNames(item).some(
        (poolName) => poolName.toLowerCase() === selectedPool,
      ),
    );
  }, [washFulfillments, filters.poolName, getFulfillmentPoolNames]);

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Box sx={{ mb: 3, borderBottom: "1px solid #e0e0e0" }}>
        <Tabs
          value={tabIndex}
          onChange={(e, newValue) => setTabIndex(newValue)}
          variant="standard"
          TabIndicatorProps={{
            sx: { height: 3, borderRadius: 1.5, backgroundColor: "#2e7d32" },
          }}
        >
          <Tab
            data-agent-action="tab-wash-requests"
            label="Wash Requests"
            sx={{
              fontWeight: 600,
              textTransform: "none",
              fontSize: "1.25rem",
              minHeight: "40px",
              px: 2,
              color: "#333",
              "&.Mui-selected": {
                color: "#2e7d32",
                backgroundColor: "#f5f5f5",
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
              },
            }}
          />
          <Tab
            data-agent-action="tab-wash-fulfillment"
            label="Wash Fulfillment"
            sx={{
              fontWeight: 600,
              textTransform: "none",
              fontSize: "1.25rem",
              minHeight: "40px",
              px: 2,
              color: "#333",
              "&.Mui-selected": {
                color: "#2e7d32",
                backgroundColor: "#f5f5f5",
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
              },
            }}
          />
          <Tab
            label="Wash Analysis"
            sx={{
              fontWeight: 600,
              textTransform: "none",
              fontSize: "1.25rem",
              minHeight: "40px",
              px: 2,
              color: "#333",
              "&.Mui-selected": {
                color: "#2e7d32",
                backgroundColor: "#f5f5f5",
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
              },
            }}
          />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <WashRequestTabs
          tabIndex={tabIndex}
          filters={filters}
          setFilters={setFilters}
          poolOptions={poolOptions}
          onSearch={fetchRequests}
          onCreateOpen={openCreateWash} // open in "wash" mode
          onCreateRewashOpen={openCreateRewash} // open in "rewash" mode (if your tabs show a second button)
          onCreateFulfillmentOpen={() => setFulfillmentDialogOpen(true)}
        />
      )}

      {tabIndex === 1 && (
        <WashFulfillmentTabs
          filters={filters}
          setFilters={setFilters}
          poolOptions={fulfillmentPoolOptions}
          onSearch={fetchFulfillments}
          onCreateFulfillmentOpen={() => setFulfillmentDialogOpen(true)}
        />
      )}

      {tabIndex === 0 && (
        <>
         {/* <PendingItemsDashboard /> */}
          <WashRequestTable
            data={filteredWashRequests}
            onSelect={setSelectedRequest}
            onDeleted={async () => {
              await reloadWashRequests();
              handleSnackbar("Wash Request deleted", "success");
            }}
          />
          <WashRequestDrawer
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
          />

          <WRUnifiedDialog
            open={createOpen}
            mode={createMode}
            onModeChange={setCreateMode}
            onClose={closeCreate}
            onSuccess={() => {
              const successFor = createMode === "rewash" ? "Rewash" : "Wash";
              closeCreate();
              reloadWashRequests();
              handleSnackbar(
                `${successFor} Request created successfully!`,
                "success",
              );
            }}
          />
        </>
      )}

      {tabIndex === 1 && (
        <>
          <WashFulfillmentTable
            data={filteredWashFulfillments}
            onSelect={setSelectedFulfillment}
          />
          <WashFulfillmentDrawer
            fulfillment={selectedFulfillment}
            onClose={() => setSelectedFulfillment(null)}
          />
          <FulfillmentDialog
            open={fulfillmentDialogOpen}
            onClose={() => {
              setFulfillmentDialogOpen(false);
              setSelectedRequest(null);
            }}
            washRequest={selectedRequest}
            onSuccess={() => {
              setFulfillmentDialogOpen(false);
              setSelectedRequest(null);
              handleSnackbar("Fulfillment created successfully");
              fetchFulfillments();
            }}
          />
        </>
      )}

      {tabIndex === 2 && <WashAnalysis />}

      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Container>
  );
}

export default WashRequestsPage;
