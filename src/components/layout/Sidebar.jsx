import React from "react";
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, Avatar, Menu, MenuItem } from "@mui/material";
import {
    Hotel as HotelIcon,
    ShoppingCart as ShoppingCartIcon,
    People as UserIcon,
    LocalShipping as LocalShippingIcon,
    FlightTakeoff as FlightTakeoffIcon,
    Receipt as InvoiceIcon,
    Business as VendorIcon,
    LocalLaundryService as LaundryVendorIcon,
    Inventory as InventoryIcon,
    Logout as LogoutIcon,
    Wash as WashIcon,
    Summarize as SummarizeIcon,
    DashboardCustomize as DashboardCustomizeIcon,
    Route as RouteIcon,
    Bolt as BoltIcon,
    DonutSmall as DonutSmallIcon,
} from "@mui/icons-material";
import { matchPath } from "react-router-dom";
import ErrorIcon from '@mui/icons-material/Error';
import RuleIcon from '@mui/icons-material/Rule';
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

import WarehousePill from "./WarehousePill.jsx";

const menuItems = [
    { text: "Overview", path: "/dashboard", icon: <DonutSmallIcon /> },
    { text: "Hotels", path: "/hotels", icon: <HotelIcon /> },
    { text: "Products", path: "/products", icon: <ShoppingCartIcon /> },
    { text: "Users", path: "/users", icon: <UserIcon /> },
    { text: "Orders", path: "/orders", icon: <LocalShippingIcon /> },
    { text: "Trips", path: "/trips", icon: <FlightTakeoffIcon /> },
    { text: "Manage Routes", path: "/routes", icon: <RouteIcon /> },
    { text: "Vehicles", path: "/vehicles", icon: <LocalShippingIcon /> },
    { text: "Wash Requests", path: "/wash-requests", icon: <WashIcon /> },
    { text: "Billing", path:"/billing", icon:<AttachMoneyIcon />},
    { text: "Invoices", path: "/invoices", icon: <InvoiceIcon /> },
    // { text: "Generate Invoice", path: "/generate-invoice", icon: <InvoiceIcon /> },
    { text: "Vendor", path: "/vendors", icon: <VendorIcon /> },
    { text: "Laundry Vendor", path: "/laundry-vendors", icon: <LaundryVendorIcon /> },
    // { text: "Customer Reservation", path: "/customer-inventory-reservation", icon: <DashboardCustomizeIcon /> },
    { text: "Inventory", path: "/inventory", icon: <InventoryIcon /> },
    { text: "Inventory Pool", path: "/inventory-pool", icon: <InventoryIcon /> },
    { text: "Inventory Summary", path: "/inventory-summary", icon: <SummarizeIcon /> },
    { text: "Issue Tracker", path: "/issue-tracker", icon: <ErrorIcon /> },
    { text: "Damage Assessment", path: "/damage-assessment", icon: <RuleIcon />}
];

const Sidebar = ({ currentPath, onNavigate, onLogout }) => {
    let currentUser = { name: "Guest", role: "User" };
    try {
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) currentUser = JSON.parse(storedUser);
    } catch {
        console.warn("Invalid user data in localStorage");
    }

    // No accordion: flat list; keep compact header.
    // Avatar popover for showing full name and role
    const [userInfoAnchor, setUserInfoAnchor] = React.useState(null);
    const openUserInfo = Boolean(userInfoAnchor);
    const handleAvatarClick = (e) => setUserInfoAnchor(e.currentTarget);
    const handleUserInfoClose = () => setUserInfoAnchor(null);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box
                sx={{
                    background:
                        "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
                    color: "white",
                }}
            >
                <Box sx={{ px: 1.25, pt: 1.25, pb: 0.75 }}>
                    {/* Brand: FLASH + lightning, with byline below */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 'auto', mx: 'auto', mb: 0.8 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, whiteSpace: 'nowrap' }}>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontFamily: '"Exo 2", "Inter", "Roboto", sans-serif',
                                    fontStyle: 'italic',
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    letterSpacing: 0.5,
                                    fontSize: { xs: '1.6rem', md: '1.9rem' },
                                    color: '#ffffff',
                                    textShadow: '0 0 4px rgba(255,255,255,0.3), 0 0 10px rgba(255,255,255,0.18)',
                                    textTransform: 'uppercase',
                                }}
                            >
                                FLASH
                            </Typography>
                            <BoltIcon
                                sx={{
                                    fontSize: { xs: '1.7rem', md: '2.05rem' },
                                    color: '#ffeb3b',
                                    opacity: 1,
                                    filter: 'drop-shadow(0 0 4px rgba(255,235,59,0.6)) drop-shadow(0 0 10px rgba(255,235,59,0.35))',
                                    lineHeight: 1,
                                    alignSelf: 'center',
                                    ml: -0.5,
                                    position: 'relative',
                                    top: '0.02em',
                                }}
                            />
                        </Box>
                        <Typography
                            component="div"
                            sx={{
                                fontFamily: '"Inter", "Roboto", sans-serif',
                                fontWeight: 600,
                                fontSize: { xs: '0.62rem', md: '0.7rem' },
                                background: 'linear-gradient(45deg, #ffffff 0%, rgba(255,255,255,0.95) 75%, rgba(214,255,230,0.22) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                lineHeight: 1.05,
                                letterSpacing: 0.2,
                                textShadow: 'none',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                display: 'block',
                                textAlign: 'left',
                                mt: 0.15,
                            }}
                        >
                            by LinenGrass
                        </Typography>
                    </Box>

                    {/* ===== Characterful "Flash" line that looks full ===== */}
                    {/* <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", "@media (max-height:700px)": { display: "none" } }}>
                        <Box
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 0.75,
                                py: 0.15,
                                borderRadius: 999,
                                backgroundColor: "rgba(255,255,255,0.12)",
                                border: "1px solid rgba(255,255,255,0.25)",
                                boxShadow:
                                    "inset 0 1px 0 rgba(255,255,255,0.25)",
                                backdropFilter: "blur(2px)",
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    fontFamily:
                                        "'Orbitron', 'Inter', 'Roboto', sans-serif",
                                    letterSpacing: 0.6,
                                    lineHeight: 1,
                                }}
                            >
                                FLASH
                            </Typography>
                            <BoltIcon sx={{ fontSize: 16, opacity: 0.9 }} />
                        </Box>

                        <Box
                            sx={{
                                ml: 1,
                                flexGrow: 1,
                                height: 1,
                                background:
                                    "linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.0) 100%)",
                            }}
                        />
                    </Box> */}
                </Box>

                <Divider sx={{ backgroundColor: "rgba(255,255,255,0.2)", height: "1px" }} />

                {/* Compact row: bulgier warehouse pill + avatar on the right */}
                <Box sx={{ px: 1, py: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <WarehousePill
                                pillMode="code-name"
                                fullWidth
                                sx={{
                                    width: "100%",
                                    maxWidth: "none",
                                    display: "flex",
                                    height: 34,
                                    px: 1,
                                    gap: 0.6,
                                    color: "#fff",
                                    borderWidth: 1,
                                    borderStyle: "solid",
                                    borderColor: "rgba(255,255,255,0.5)",
                                    backgroundColor: "rgba(34, 255, 93, 0.08)",
                                    boxShadow: "none",
                                    backdropFilter: "none",
                                    "& *": { fontSize: "0.78rem" },
                                }}
                            />
                        </Box>
                        <Avatar
                            onClick={handleAvatarClick}
                            sx={{
                                width: 34,
                                height: 34,
                                fontSize: 15,
                                bgcolor: "#2b7930ff",
                                cursor: "pointer",
                                border: "1px solid rgba(255,255,255,0.5)",
                                boxShadow: "none",
                                fontWeight: 800
                            }}
                            title={`${currentUser.name || "Guest"} • ${(currentUser.role || "User").toUpperCase()}`}
                        >
                            {(currentUser.name || "G").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Menu
                            anchorEl={userInfoAnchor}
                            open={openUserInfo}
                            onClose={handleUserInfoClose}
                            anchorOrigin={{ vertical: "center", horizontal: "right" }}
                            transformOrigin={{ vertical: "center", horizontal: "left" }}
                            PaperProps={{
                                sx: {
                                    px: 1,
                                    py: 0.75,
                                    minWidth: 140,
                                    maxWidth: 200,
                                    mx: 0.75,
                                    borderRadius: 1,
                                    bgcolor: "#163d1b",
                                    color: "#e8f5e9",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    boxShadow: "0 8px 16px rgba(0,0,0,0.18)",
                                    position: "relative",
                                    "&::before": {
                                        content: '""',
                                        position: "absolute",
                                        top: "50%",
                                        left: -6,
                                        width: 10,
                                        height: 10,
                                        bgcolor: "#163d1b",
                                        boxShadow: "-1px 0 0 rgba(255,255,255,0.2)",
                                        transform: "translateY(-50%) rotate(45deg)",
                                    },
                                },
                            }}
                        >
                            <MenuItem disabled sx={{ opacity: 1, cursor: "default", alignItems: "flex-start", '&.Mui-disabled': { opacity: 1, color: 'inherit' } }}>
                                <Box sx={{ maxWidth: "100%", overflowWrap: "anywhere" }}>
                                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#ffffff !important", whiteSpace: "normal", lineHeight: 1.25 }}>
                                        {currentUser.name || "Guest"}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.78rem", color: "#b9f6ca !important", whiteSpace: "normal", lineHeight: 1.25 }}>
                                        {(currentUser.role || "User").toUpperCase()}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ background: "linear-gradient(180deg, #43a047 0%, #2e7d32 100%)", flex: 1, display: "flex", flexDirection: "column" }}>
                <List dense sx={{ px: 1, py: 0.5 }}>
                    {menuItems.map((item, index) => {
                        // const isSelected = currentPath.startsWith(item.path);
                        const isSelected = matchPath({ path: item.path + "/*" }, currentPath);
                        const addDividerAfter = [0, 3, 6, 8, 10, 12, 15].includes(index);
                        return (
                            <React.Fragment key={item.text}>
                                <ListItem disablePadding>
                                    <ListItemButton
                                        selected={isSelected}
                                        onClick={() => onNavigate(item.path)}
                                        sx={{
                                            borderRadius: 1.5,
                                            px: 1.75,
                                            py: 0.6,
                                            minHeight: 36,
                                            backgroundColor: isSelected ? "rgba(255, 255, 255, 0.85)" : "transparent",
                                            color: isSelected ? "#000" : "#fff",
                                            boxShadow: isSelected ? "0px 2px 5px rgba(0, 0, 0, 0.18)" : "none",
                                            border: isSelected ? "1px solid #e0e0e0" : "none",
                                            transition: "background-color 0.15s ease-in-out, color 0.15s ease-in-out, box-shadow 0.15s ease-in-out, border 0.15s ease-in-out",
                                            "&:hover": { backgroundColor: !isSelected ? "rgba(255,255,255,0.1)" : undefined },
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: isSelected ? "#000" : "#fff" }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500, color: isSelected ? "#000" : "#fff" }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                                {addDividerAfter && (
                                    <Divider sx={{ my: 0.4, backgroundColor: "rgba(255,255,255,0.2)", height: "1px" }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </List>
                <Box sx={{ mt: "auto" }}>
                    <Divider sx={{ my: 0.5, backgroundColor: "rgba(255,255,255,0.2)", height: "1px" }} />
                    <List dense sx={{ px: 1, pb: 0.75 }}>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={onLogout}
                                sx={{
                                    borderRadius: 1.5,
                                    px: 1.75,
                                    py: 0.75,
                                    minHeight: 36,
                                    color: "#fff",
                                    "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32, color: "#fff" }}>
                                    <LogoutIcon />
                                </ListItemIcon>
                                <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500, color: "#fff" }} />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            </Box>
        </Box>
    );
};

export default Sidebar;
