import TabsHeader from "../common/TabsHeader";
import { Container } from "@mui/material";
import { useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";

const TABS = [
  { label: "Inventory Pool", path: "/inventory-pool", value: 0 },
  { label: "Reservation", path: "/inventory-pool/reservation", value: 1 },
];

function InventoryPoolPage() {
  const location = useLocation();
  
  // determine active tab from URL
  const activeTab = location.pathname.includes("reservation") ? 1 : 0;

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <TabsHeader
        tabs={TABS}
        value={activeTab}
      />

      {/* This will render InventoryPoolTable or ReservationTable */}
      <Outlet />
    </Container>
  )
}

export default InventoryPoolPage