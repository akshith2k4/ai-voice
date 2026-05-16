// ------------------ InventorySummaryPage.jsx ------------------
import React, { useEffect, useState } from "react";
import { Box, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { inventorySummaryService } from "../../services/inventorySummaryService";
import { inventoryService } from "../../services/inventoryService";
import CreateInwardRequestInventoryDialog from "./CreateInwardRequestInventoryDialog";
import InventoryTabs from "./InventoryTabs";
import InventorySummaryTable from "./InventorySummaryTable";
import InwardRequestsTable from "./InwardRequestsTable";
import InwardRequestDrawer from "./InwardRequestDrawer";

function InventorySummaryPage() {
  const [inventorySummary, setInventorySummary] = useState([]);
  const [inwardRequests, setInwardRequests] = useState([]);
  const [selectedInwardRequest, setSelectedInwardRequest] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    fetchInventorySummary();
    fetchInwardRequests();
    fetchWarehouses();
  }, []);

  const fetchInventorySummary = async () => {
    const res = await inventorySummaryService.getInventoryOverview();
    setInventorySummary(res.products);
  };

  const fetchInwardRequests = async () => {
    const res = await inventorySummaryService.getInwardRequests();
    setInwardRequests(res);
  };

  const fetchWarehouses = async () => {
    const res = await inventoryService.getWarehouses();
    setWarehouses(res);
  };

  const handleCreateInwardRequest = async () => {
    await fetchInwardRequests();
  };

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <InventoryTabs
        tabIndex={tabIndex}
        setTabIndex={setTabIndex}
        navigate={navigate}
        setCreateDialogOpen={setCreateDialogOpen}
      />

      {tabIndex === 0 && <InventorySummaryTable inventorySummary={inventorySummary} />}

      {tabIndex === 1 && (
        <>
          <InwardRequestsTable
            inwardRequests={inwardRequests}
            onSelect={setSelectedInwardRequest}
          />
          <InwardRequestDrawer
            inwardRequest={selectedInwardRequest}
            onClose={() => setSelectedInwardRequest(null)}
          />
          <CreateInwardRequestInventoryDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onSave={handleCreateInwardRequest}
            warehouses={warehouses}
          />
        </>
      )}
    </Container>
  );
}

export default InventorySummaryPage;
