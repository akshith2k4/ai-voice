import { Container } from "@mui/material";
import { useLocation, Outlet } from "react-router-dom";
import TabsHeader from "../common/TabsHeader";

const TABS = [
  { label: "Billing Cycle", path: "/billing", value: 0 },
  { label: "Billing Preference", path: "/billing/preference", value: 1 },
];

function BillManagementPage() {
  const location = useLocation();

  const activeTab = location.pathname.includes("preference") ? 1 : 0;

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <TabsHeader tabs={TABS} value={activeTab} />
      <Outlet />
    </Container>
  );
}

export default BillManagementPage;