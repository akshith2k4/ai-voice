import { useEffect, useState, useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    Box,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    Checkbox,
    ListItemText,
    Stack,
    Divider,
    Chip,
    Avatar,
    InputAdornment,
    Grid,
    Tabs,
    Tab,
} from "@mui/material";
import { alpha } from '@mui/material/styles';
import { 
    Search as SearchIcon,
    AssignmentInd as AssignmentIcon,
    Person as PersonIcon,
    Business as BusinessIcon
} from "@mui/icons-material";
import { routeService } from "../../services/routeService";
import { laundryVendorService } from "../../services/laundryVendorService";
import CustomSnackbar from "../layout/CustomSnackbar";

function AssignPointsDialog({ open, onClose, route, onAssigned }) {
    const [tabValue, setTabValue] = useState(0); // 0: Customers, 1: Vendors
    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    const [selectedVendorIds, setSelectedVendorIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (open) {
            setLoadingData(true);
            Promise.all([
                routeService.getAllCustomers(),
                laundryVendorService.getAllVendors()
            ]).then(([cData, vData]) => {
                setCustomers(cData || []);
                setVendors(vData || []);
                setLoadingData(false);
            }).catch(err => {
                console.error("Failed to fetch data", err);
                setLoadingData(false);
            });

            // Pre-populate selections from current route points
            if (route?.points) {
                const existingCustomers = route.points
                    .filter(p => p.partyType === "CUSTOMER")
                    .map(p => p.partyId);
                const existingVendors = route.points
                    .filter(p => p.partyType === "LAUNDRY_VENDOR")
                    .map(p => p.partyId);
                
                setSelectedCustomerIds(existingCustomers);
                setSelectedVendorIds(existingVendors);
            } else {
                setSelectedCustomerIds([]);
                setSelectedVendorIds([]);
            }
            
            setSearchTerm("");
            setTabValue(0);
        }
    }, [open, route]);

    const activeList = tabValue === 0 ? customers : vendors;
    const selectedIds = tabValue === 0 ? selectedCustomerIds : selectedVendorIds;
    const setSelectedIds = tabValue === 0 ? setSelectedCustomerIds : setSelectedVendorIds;

    const filteredItems = useMemo(() => {
        if (!searchTerm) return activeList;
        return activeList.filter(item => 
            (item.name || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, activeList]);

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleAssign = async () => {
        setLoading(true);
        try {
            const currentPoints = route?.points || [];
            
            // New selections to be added
            const customerPointsToAdd = customers
                .filter((c) => selectedCustomerIds.includes(c.id) && !currentPoints.some(p => p.partyId === c.id && p.partyType === "CUSTOMER"))
                .map((c) => ({ partyId: c.id, partyType: "CUSTOMER" }));

            const vendorPointsToAdd = vendors
                .filter((v) => selectedVendorIds.includes(v.id) && !currentPoints.some(p => p.partyId === v.id && p.partyType === "LAUNDRY_VENDOR"))
                .map((v) => ({ partyId: v.id, partyType: "LAUNDRY_VENDOR" }));

            const pointsToAdd = [...customerPointsToAdd, ...vendorPointsToAdd];

            // Deselected items to be removed
            const pointsToRemove = currentPoints.filter(p => {
                if (p.partyType === "CUSTOMER") return !selectedCustomerIds.includes(p.partyId);
                if (p.partyType === "LAUNDRY_VENDOR") return !selectedVendorIds.includes(p.partyId);
                return false;
            }).map(p => ({ partyId: p.partyId, partyType: p.partyType }));

            const promises = [];
            if (pointsToAdd.length > 0) {
                promises.push(routeService.assignPoints(route.id, pointsToAdd));
            }
            if (pointsToRemove.length > 0) {
                promises.push(routeService.removePoints(route.id, pointsToRemove));
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                setSnackbarOpen(true);
                onAssigned();
                onClose();
            } else {
                onClose(); // Nothing changed
            }
        } catch (error) {
            console.error('Error updating points:', error);
            // Optionally set error snackbar here
        } finally {
            setLoading(false);
        }
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const selectAll = () => setSelectedIds(filteredItems.map((item) => item.id));
    const deselectAll = () => setSelectedIds([]);

    const totalSelectedCount = selectedCustomerIds.length + selectedVendorIds.length;

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose} 
                fullWidth 
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 1,
                    }
                }}
            >
                <DialogTitle sx={{ 
                    px: 3,
                    py: 2,
                    backgroundColor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AssignmentIcon sx={{ mr: 1, color: 'success.main' }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Assign Points to <strong>{route?.name}</strong>
                            </Typography>
                        </Box>
                        {totalSelectedCount > 0 && (
                            <Chip 
                                label={`${totalSelectedCount} Selected`} 
                                size="small" 
                                color="success" 
                                variant="filled"
                            />
                        )}
                    </Box>
                </DialogTitle>
                
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
                    <Tab label={`Customers (${selectedCustomerIds.length})`} />
                    <Tab label={`Vendors (${selectedVendorIds.length})`} />
                </Tabs>

                <DialogContent sx={{ p: 3 }} dividers>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress size={30} />
                        </Box>
                    ) : (
                        <>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder={`Search ${tabValue === 0 ? 'customers' : 'vendors'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="body2" color="text.secondary">
                                    {filteredItems.length} {tabValue === 0 ? 'customers' : 'vendors'} found
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button size="small" onClick={selectAll} sx={{ textTransform: "none" }}>Select All</Button>
                                    <Button size="small" onClick={deselectAll} sx={{ textTransform: "none" }}>Deselect All</Button>
                                </Stack>
                            </Box>

                            <Box sx={{ maxHeight: 350, overflowY: "auto", border: 1, borderColor: 'divider', borderRadius: 1 }}>
                                <List dense>
                                    {console.log("filteredItems",filteredItems)}
                                    {filteredItems.map((item) => (
                                        <ListItem
                                            key={item.id}
                                            disablePadding
                                            sx={{
                                                px: 1.5,
                                                py: 0.5,
                                                borderBottom: 1,
                                                borderColor: 'divider',
                                                backgroundColor: selectedIds.includes(item.id) ? alpha('#2e7d32', 0.08) : 'inherit',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => toggleSelect(item.id)}
                                        >
                                            <ListItemIcon>
                                                <Checkbox checked={selectedIds.includes(item.id)} disableRipple />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={<Typography variant="body2" fontWeight={500}>{item.name}</Typography>}
                                                secondary={item.email || item.phone || (tabValue === 1 ? 'Laundry Vendor' : 'Customer')}
                                            />
                                        </ListItem>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <Box py={3} textAlign="center">
                                            <Typography color="text.secondary">No items found</Typography>
                                        </Box>
                                    )}
                                </List>
                            </Box>
                        </>
                    )}
                </DialogContent>
                
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} disabled={loading} color="inherit">Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAssign}
                        disabled={totalSelectedCount === 0 || loading}
                        startIcon={loading ? <CircularProgress size={18} /> : null}
                        sx={{
                            background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                        }}
                    >
                        {loading ? 'Assigning...' : 'Assign'}
                    </Button>
                </DialogActions>
            </Dialog>

            <CustomSnackbar
                open={snackbarOpen}
                message="Points assigned successfully!"
                severity="success"
                onClose={handleSnackbarClose}
            />
        </>
    );
}

export default AssignPointsDialog;
