import { Box, Chip, Tab, Tabs, Typography } from "@mui/material";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import InventoryStatusUpdateModule from "./InventoryStatusUpdateModule";
import PopulateDeliveryItemsModule from "./PopulateDeliveryItemsModule";
import RfidScanPage from "./RfidScanPage";

const MODULES = [
  {
    id: "rfid-scan",
    label: "RFID Scan",
    description:
      "Build RFID scan payloads from tags and submit them to the scan data API.",
    component: RfidScanPage,
  },
  {
    id: "populate-delivery-items",
    label: "Populate Item in Delivery Request",
    description:
      "Populate delivery request items from packing by providing a visit ID.",
    component: PopulateDeliveryItemsModule,
  },
  {
    id: "inventory-status-update",
    label: "Inventory Status Update",
    description:
      "Construct and submit bulk inventory status update payloads with review before API submission.",
    component: InventoryStatusUpdateModule,
  },
];

const MODULE_IDS = new Set(MODULES.map((module) => module.id));
const DEFAULT_MODULE_ID = MODULES[0].id;

export default function HelpersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedModuleId = searchParams.get("module");
  const activeModuleId = MODULE_IDS.has(requestedModuleId)
    ? requestedModuleId
    : DEFAULT_MODULE_ID;

  const activeModule = useMemo(
    () => MODULES.find((module) => module.id === activeModuleId) ?? MODULES[0],
    [activeModuleId]
  );

  const ActiveModuleComponent = activeModule.component;

  const handleModuleChange = (_, nextModuleId) => {
    const nextSearchParams =
      nextModuleId === DEFAULT_MODULE_ID ? {} : { module: nextModuleId };

    setSearchParams(nextSearchParams, { replace: true });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "#f4f6f8",
        overflow: "hidden",
      }}
    >
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
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Helpers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Utility modules for one-off operational workflows.
          </Typography>
        </Box>
        <Chip label={`${MODULES.length} modules`} size="small" variant="outlined" />
      </Box>

      <Box
        sx={{
          px: 2,
          bgcolor: "#fff",
          borderBottom: "1px solid #e0e0e0",
          flexShrink: 0,
        }}
      >
        <Tabs
          value={activeModuleId}
          onChange={handleModuleChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {MODULES.map((module) => (
            <Tab key={module.id} value={module.id} label={module.label} />
          ))}
        </Tabs>
      </Box>

      <Box
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: "#fafafa",
          borderBottom: "1px solid #e0e0e0",
          flexShrink: 0,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {activeModule.description}
        </Typography>
      </Box>

      <ActiveModuleComponent key={activeModuleId} />
    </Box>
  );
}
