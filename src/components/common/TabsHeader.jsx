import { Box, Tabs, Tab } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function TabsHeader({ tabs = [], value }) {
  const navigate = useNavigate();

  const handleChange = (e, newValue) => {
    if (tabs[newValue].path) {
      navigate(tabs[newValue].path);
    }
  };

  return (
    <Box sx={{ mb: 3, borderBottom: "1px solid #e0e0e0" }}>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="standard"
        TabIndicatorProps={{
          sx: { height: 3, borderRadius: 1.5, backgroundColor: "#2e7d32" },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={tab.label}
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
        ))}
      </Tabs>
    </Box>
  );
}
