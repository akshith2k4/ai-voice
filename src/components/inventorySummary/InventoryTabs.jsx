// ------------------ InventoryTabs.jsx ------------------
import React from "react";
import { Tabs, Tab, Button, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";

function InventoryTabs({ tabIndex, setTabIndex, navigate, setCreateDialogOpen }) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 3, borderBottom: "1px solid #e0e0e0" }}
    >
      <Tabs
        value={tabIndex}
        onChange={(e, newValue) => setTabIndex(newValue)}
        variant="standard"
        TabIndicatorProps={{
          sx: {
            height: 3,
            borderRadius: 1.5,
            backgroundColor: "#2e7d32",
          },
        }}
      >
        <Tab
          label="Inventory Summary"
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
          label="Inward Requests"
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

      {tabIndex === 0 && (
        <Button
          variant="contained"
          startIcon={<VisibilityIcon />}
          onClick={() => navigate("/inventory")}
          sx={{
            px: 2,
            background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
            boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
          }}
        >
          View Item Details
        </Button>
      )}

      {tabIndex === 1 && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            px: 2,
            background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
            boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
          }}
        >
          Create Inward Request
        </Button>
      )}
    </Box>
  );
}

export default InventoryTabs;
