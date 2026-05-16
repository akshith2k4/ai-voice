import React from "react";
import { Box, Drawer, Toolbar } from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useDcid } from "../../context/DcidContext";
import LockOverlayUI from "./LockOverlayUI";

const drawerWidth = "16rem";

const drawerStyles = {
  width: drawerWidth,
  boxSizing: "border-box",
  background: "linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%)",
  color: "#fff",
  borderRadius: 0,
};

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { dcid } = useDcid();

  const outletKey = React.useMemo(
    () => `${location.pathname}|${dcid ?? "all"}`,
    [location.pathname, dcid]
  );

  const toggleMobileDrawer = () => setMobileOpen(!mobileOpen);

  const handleLogout = () => {
    localStorage.clear(); // Clear all localStorage data
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    });
    navigate("/login");
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
    >
      {/* GLOBAL LOCK OVERLAY */}
      <LockOverlayUI />

      {/* Navigation Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="sidebar"
      >
        {/* Drawer for Mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={toggleMobileDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": drawerStyles,
          }}
        >
          <Sidebar
            currentPath={location.pathname}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        </Drawer>

        {/* Drawer for Desktop */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": drawerStyles,
          }}
        >
          <Sidebar
            currentPath={location.pathname}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth})` },
        }}
      >
        <Toolbar />
        {/* Force re-mount of content when warehouse (dcid) changes */}
        <Box key={outletKey} sx={{ display: "contents" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default Layout;
