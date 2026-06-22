import { useEffect, useState, useMemo, useCallback } from "react";
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
    Chip,
    Avatar,
    InputAdornment,
    Tabs,
    Tab,
    IconButton,
    FormControlLabel,
    Switch
} from "@mui/material";
import { alpha } from '@mui/material/styles';
import { 
    Search as SearchIcon,
    AssignmentInd as AssignmentIcon,
    Person as PersonIcon,
    Business as BusinessIcon,
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon,
    DragIndicator as DragIndicatorIcon
} from "@mui/icons-material";
import { routeService } from "../../services/routeService";
import { laundryVendorService } from "../../services/laundryVendorService";
import CustomSnackbar from "../layout/CustomSnackbar";
import GreenButton from "../common/GreenButton";

function AssignPointsDialog({ open, onClose, route, onAssigned }) {
    const [step, setStep] = useState(1); // 1: Selection, 2: Sequencing
    const [sequencingPoints, setSequencingPoints] = useState([]);
    const [tabValue, setTabValue] = useState(0); // 0: Customers, 1: Vendors
    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    const [selectedVendorIds, setSelectedVendorIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [availableOnly, setAvailableOnly] = useState(false);

    // Drag and drop state
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

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
            setAvailableOnly(false);
            setStep(1);
            setSequencingPoints([]);
            setDraggedIndex(null);
            setDragOverIndex(null);
        }
    }, [open, route]);

    const activeList = tabValue === 0 ? customers : vendors;
    const selectedIds = tabValue === 0 ? selectedCustomerIds : selectedVendorIds;
    const setSelectedIds = tabValue === 0 ? setSelectedCustomerIds : setSelectedVendorIds;

    const getAssignmentStatus = useCallback((itemId, itemType) => {
        if (!route) return { status: 'NOT_ASSIGNED' };
        
        // Check if assigned to the current route
        const isCurrent = route.points?.some(
            p => p.partyId === itemId && p.partyType === itemType
        );
        if (isCurrent) {
            return { status: 'CURRENT_ROUTE', routeName: route.name };
        }
        
        return { status: 'NOT_ASSIGNED' };
    }, [route]);

    const filteredItems = useMemo(() => {
        let list = activeList;
        if (searchTerm) {
            list = list.filter(item => 
                (item.name || "").toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (availableOnly) {
            const itemType = tabValue === 0 ? "CUSTOMER" : "LAUNDRY_VENDOR";
            list = list.filter(item => {
                const statusInfo = getAssignmentStatus(item.id, itemType);
                return statusInfo.status === 'NOT_ASSIGNED';
            });
        }
        return list;
    }, [searchTerm, activeList, availableOnly, tabValue, getAssignmentStatus]);

    const toggleSelect = (id) => {
        const itemType = tabValue === 0 ? "CUSTOMER" : "LAUNDRY_VENDOR";
        const statusInfo = getAssignmentStatus(id, itemType);
        if (statusInfo.status !== 'NOT_ASSIGNED') return; // Locked

        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleGoToSequencing = () => {
        const currentPoints = route?.points || [];
        
        // 1. Keep existing points that are still selected
        const remainingExisting = currentPoints.filter(p => {
            if (p.partyType === "CUSTOMER") {
                return selectedCustomerIds.includes(p.partyId);
            }
            if (p.partyType === "LAUNDRY_VENDOR") {
                return selectedVendorIds.includes(p.partyId);
            }
            return false;
        });

        // 2. Find newly selected points
        const newCustomers = customers
            .filter(c => selectedCustomerIds.includes(c.id) && !currentPoints.some(p => p.partyId === c.id && p.partyType === "CUSTOMER"))
            .map(c => ({
                partyId: c.id,
                partyType: "CUSTOMER",
                name: c.name,
                isNew: true
            }));

        const newVendors = vendors
            .filter(v => selectedVendorIds.includes(v.id) && !currentPoints.some(p => p.partyId === v.id && p.partyType === "LAUNDRY_VENDOR"))
            .map(v => ({
                partyId: v.id,
                partyType: "LAUNDRY_VENDOR",
                name: v.name,
                isNew: true
            }));

        // 3. Combine them. By default, append new ones at the end, preserving relative order of existing ones.
        const combined = [
            ...remainingExisting.map(p => ({ ...p, isNew: false })),
            ...newCustomers,
            ...newVendors
        ];
        
        setSequencingPoints(combined);
        setStep(2);
    };

    // Drag & drop handlers
    const handleDragStart = (e, index) => {
        e.dataTransfer.setData("text/plain", String(index));
        setTimeout(() => {
            setDraggedIndex(index);
        }, 0);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        const fromIndex = Number(e.dataTransfer.getData("text/plain"));
        if (fromIndex !== index) {
            setSequencingPoints((prev) => {
                const next = [...prev];
                const [moved] = next.splice(fromIndex, 1);
                next.splice(index, 0, moved);
                return next;
            });
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
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

            // 1. Call assignPoints and removePoints sequentially
            if (pointsToAdd.length > 0) {
                await routeService.assignPoints(route.id, pointsToAdd);
            }
            if (pointsToRemove.length > 0) {
                await routeService.removePoints(route.id, pointsToRemove);
            }

            // 2. Save final sequence using sequencingPoints order
            const finalSequencePayload = sequencingPoints.map((p, idx) => ({
                partyId: p.partyId,
                partyType: p.partyType,
                sequence: idx + 1
            }));
            await routeService.updatePointsSequence(route.id, finalSequencePayload);

            setSnackbarOpen(true);
            onAssigned();
            onClose();
        } catch (error) {
            console.error('Error updating points and sequence:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const hasChanges = useMemo(() => {
        if (!route) return false;
        const initialCustomers = route.points
            ?.filter(p => p.partyType === "CUSTOMER")
            .map(p => p.partyId) || [];
        const initialVendors = route.points
            ?.filter(p => p.partyType === "LAUNDRY_VENDOR")
            .map(p => p.partyId) || [];

        if (selectedCustomerIds.length !== initialCustomers.length) return true;
        if (selectedVendorIds.length !== initialVendors.length) return true;

        const customerChanged = selectedCustomerIds.some(id => !initialCustomers.includes(id));
        if (customerChanged) return true;

        const vendorChanged = selectedVendorIds.some(id => !initialVendors.includes(id));
        if (vendorChanged) return true;

        return false;
    }, [route, selectedCustomerIds, selectedVendorIds]);

    const totalSelectedCount = selectedCustomerIds.length + selectedVendorIds.length;

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose} 
                fullWidth 
                maxWidth="sm"
                scroll="paper"
                slotProps={{
                    backdrop: {
                        sx: {
                            backdropFilter: 'blur(8px)',
                            backgroundColor: 'rgba(0, 0, 0, 0.4)'
                        }
                    }
                }}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    px: 2.5,
                    py: 2,
                    backgroundColor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ bgcolor: alpha('#4caf50', 0.1), color: 'success.main', mr: 1.5, width: 36, height: 36 }}>
                                <AssignmentIcon fontSize="small" />
                            </Avatar>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                                    {step === 1 ? "Assign Points" : "Sequence Stops"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Assign to <strong>{route?.name}</strong>
                                </Typography>
                            </Box>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {step === 1 && totalSelectedCount > 0 && (
                                <Chip 
                                    label={`${totalSelectedCount} Selected`} 
                                    size="small" 
                                    color="success" 
                                    variant="filled"
                                    sx={{ fontWeight: 600, height: 22, fontSize: '0.72rem' }}
                                />
                            )}
                            <IconButton 
                                onClick={onClose} 
                                size="small"
                                sx={{ 
                                    color: 'text.secondary',
                                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)', color: 'text.primary' }
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Box>
                </DialogTitle>
                
                {step === 1 && (
                    <Tabs 
                        value={tabValue} 
                        onChange={(_, v) => setTabValue(v)} 
                        variant="fullWidth"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            backgroundColor: 'rgba(0, 0, 0, 0.015)',
                            minHeight: 40,
                            '& .MuiTab-root': {
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: '0.88rem',
                                py: 1.5,
                                minHeight: 40,
                                color: 'text.secondary',
                                '&.Mui-selected': {
                                    color: 'success.main',
                                }
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: 'success.main',
                                height: 3,
                                borderRadius: '3px 3px 0 0'
                            }
                        }}
                    >
                        <Tab label={`Customers (${selectedCustomerIds.length})`} />
                        <Tab label={`Vendors (${selectedVendorIds.length})`} />
                    </Tabs>
                )}

                <DialogContent sx={{ p: 2, backgroundColor: '#fafafa' }}>
                    {loadingData ? (
                        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6} gap={1.5}>
                            <CircularProgress size={28} color="success" />
                            <Typography variant="caption" color="text.secondary">Loading route points...</Typography>
                        </Box>
                    ) : step === 1 ? (
                        <>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder={`Search ${tabValue === 0 ? 'customers' : 'vendors'} by name...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ 
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        backgroundColor: 'background.paper',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            backgroundColor: 'background.paper',
                                        },
                                        '&.Mui-focused': {
                                            boxShadow: `0 0 0 2px ${alpha('#4caf50', 0.2)}`,
                                            '& fieldset': {
                                                borderColor: 'success.main',
                                            }
                                        }
                                    }
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} px={0.5}>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    {filteredItems.length} {tabValue === 0 ? 'customers' : 'vendors'} found
                                </Typography>
                                <FormControlLabel
                                    control={
                                        <Switch 
                                            checked={availableOnly} 
                                            onChange={(e) => setAvailableOnly(e.target.checked)} 
                                            color="success"
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                                            Available Only
                                        </Typography>
                                    }
                                    sx={{ mr: 0 }}
                                />
                            </Box>

                            <Box 
                                sx={{ 
                                    maxHeight: 320, 
                                    overflowY: "auto", 
                                    border: '1px solid rgba(0, 0, 0, 0.06)', 
                                    borderRadius: '8px',
                                    p: 0,
                                    backgroundColor: 'background.paper',
                                    '&::-webkit-scrollbar': {
                                        width: '4px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: 'transparent',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: 'rgba(0, 0, 0, 0.1)',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb:hover': {
                                        background: 'rgba(0, 0, 0, 0.2)',
                                    },
                                }}
                            >
                                <List dense disablePadding>
                                    {filteredItems.map((item) => {
                                        const isCustomer = tabValue === 0;
                                        const type = isCustomer ? "CUSTOMER" : "LAUNDRY_VENDOR";
                                        const statusInfo = getAssignmentStatus(item.id, type);
                                        const isLocked = statusInfo.status !== 'NOT_ASSIGNED';
                                        const isChecked = selectedIds.includes(item.id);
                                        
                                        return (
                                            <ListItem
                                                key={item.id}
                                                disablePadding
                                                sx={{
                                                    px: 2,
                                                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                                    backgroundColor: isChecked && !isLocked ? alpha('#4caf50', 0.02) : 'transparent',
                                                    transition: 'all 0.15s ease',
                                                    opacity: isLocked ? 0.6 : 1,
                                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                                    '&:hover': {
                                                        backgroundColor: isLocked ? 'transparent' : (isChecked ? alpha('#4caf50', 0.05) : 'rgba(0, 0, 0, 0.025)'),
                                                    },
                                                    '&:last-child': {
                                                        borderBottom: 'none'
                                                    }
                                                }}
                                                onClick={() => !isLocked && toggleSelect(item.id)}
                                            >
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    <Checkbox 
                                                        checked={isChecked} 
                                                        disabled={isLocked}
                                                        disableRipple 
                                                        sx={{
                                                            p: 0,
                                                            color: 'rgba(0, 0, 0, 0.25)',
                                                            '&.Mui-checked': {
                                                                color: 'success.main',
                                                            },
                                                            '&.Mui-disabled': {
                                                                color: isChecked ? 'success.light' : 'rgba(0, 0, 0, 0.12)',
                                                            }
                                                        }}
                                                    />
                                                </ListItemIcon>

                                                <ListItemIcon sx={{ minWidth: 40 }}>
                                                    <Avatar 
                                                        sx={{ 
                                                            bgcolor: isLocked 
                                                                ? 'rgba(0, 0, 0, 0.04)' 
                                                                : (isChecked ? alpha('#4caf50', 0.1) : 'rgba(0, 0, 0, 0.03)'),
                                                            color: isLocked 
                                                                ? 'text.disabled' 
                                                                : (isChecked ? 'success.main' : 'text.secondary'),
                                                            width: 28, 
                                                            height: 28,
                                                            fontSize: '0.9rem',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        {isCustomer ? <PersonIcon fontSize="small" sx={{ fontSize: 16 }} /> : <BusinessIcon fontSize="small" sx={{ fontSize: 16 }} />}
                                                    </Avatar>
                                                </ListItemIcon>

                                                <ListItemText
                                                    sx={{ py: 1, pr: 1.5 }}
                                                    primary={
                                                        <Typography 
                                                            variant="body2" 
                                                            fontWeight={500} 
                                                            color="text.primary"
                                                        >
                                                            {item.name}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Typography 
                                                            variant="caption" 
                                                            color="text.secondary" 
                                                            sx={{ display: 'block', mt: 0.1 }}
                                                        >
                                                            {item.email || item.phone || (isCustomer ? 'Customer' : 'Laundry Vendor')}
                                                        </Typography>
                                                    }
                                                />

                                                {isLocked && (
                                                    <Box sx={{ pr: 0.5, display: 'flex', alignItems: 'center' }}>
                                                        <Chip 
                                                            icon={<CheckCircleIcon sx={{ fontSize: '12px !important', color: 'success.main !important' }} />}
                                                            label="Assigned" 
                                                            size="small" 
                                                            variant="outlined"
                                                            color="success"
                                                            sx={{ 
                                                                height: 18, 
                                                                fontSize: '0.65rem',
                                                                fontWeight: 500,
                                                                backgroundColor: alpha('#4caf50', 0.05),
                                                                borderColor: alpha('#4caf50', 0.15),
                                                                '& .MuiChip-label': { px: 0.75 }
                                                            }}
                                                        />
                                                    </Box>
                                                )}
                                            </ListItem>
                                        );
                                    })}
                                    {filteredItems.length === 0 && (
                                        <Box py={5} textAlign="center" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                                            <SearchIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>No matches found</Typography>
                                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>Try adjusting your search query or filters</Typography>
                                        </Box>
                                    )}
                                </List>
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ p: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontWeight: 500 }}>
                                Review and adjust the sequence of stops for this route. Newly added stops are marked in green.
                            </Typography>
                            
                            <Box 
                                sx={{ 
                                    maxHeight: 320, 
                                    overflowY: "auto", 
                                    border: '1px solid rgba(0, 0, 0, 0.06)', 
                                    borderRadius: '8px',
                                    p: 1,
                                    backgroundColor: '#fafafa',
                                    '&::-webkit-scrollbar': {
                                        width: '4px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: 'transparent',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: 'rgba(0, 0, 0, 0.1)',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb:hover': {
                                        background: 'rgba(0, 0, 0, 0.2)',
                                    },
                                }}
                            >
                                <Stack spacing={1}>
                                    {sequencingPoints.map((item, idx) => {
                                        const isCustomer = item.partyType === "CUSTOMER";
                                        const isDragOver = dragOverIndex === idx;
                                        const isDragging = draggedIndex === idx;

                                        return (
                                            <Box
                                                key={`${item.partyType}-${item.partyId}`}
                                                draggable={!loading}
                                                onDragStart={(e) => handleDragStart(e, idx)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                onDrop={(e) => handleDrop(e, idx)}
                                                onDragLeave={() => setDragOverIndex(null)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    p: 1.5,
                                                    border: '1px solid',
                                                    borderColor: isDragOver ? 'success.main' : 'divider',
                                                    borderRadius: '8px',
                                                    bgcolor: isDragOver ? alpha('#4caf50', 0.04) : 'background.paper',
                                                    outline: isDragOver ? '1.5px solid #4caf50' : 'none',
                                                    outlineOffset: '-1.5px',
                                                    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                                                    opacity: isDragging ? 0.4 : 1,
                                                    cursor: loading ? 'default' : 'grab',
                                                    transition: 'all 0.15s ease',
                                                    '&:active': { cursor: loading ? 'default' : 'grabbing' },
                                                    '&:hover': {
                                                        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : '0 4px 12px rgba(0,0,0,0.06)',
                                                        borderColor: isDragOver ? 'success.main' : 'rgba(0, 0, 0, 0.15)',
                                                    }
                                                }}
                                            >
                                                {/* Drag Handle Icon */}
                                                <Box 
                                                    sx={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        color: 'text.secondary', 
                                                        mr: 1.5, 
                                                        opacity: loading ? 0.2 : 0.6 
                                                    }}
                                                >
                                                    <DragIndicatorIcon sx={{ fontSize: 20 }} />
                                                </Box>

                                                {/* Sequence Badge */}
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        fontWeight: 700, 
                                                        minWidth: 24, 
                                                        color: 'text.secondary', 
                                                        mr: 1 
                                                    }}
                                                >
                                                    {idx + 1}.
                                                </Typography>

                                                {/* Avatar */}
                                                <Avatar 
                                                    sx={{ 
                                                        bgcolor: item.isNew ? alpha('#4caf50', 0.1) : 'rgba(0, 0, 0, 0.03)',
                                                        color: item.isNew ? 'success.main' : 'text.secondary',
                                                        width: 30, 
                                                        height: 30,
                                                        mr: 2
                                                    }}
                                                >
                                                    {isCustomer ? <PersonIcon fontSize="small" sx={{ fontSize: 16 }} /> : <BusinessIcon fontSize="small" sx={{ fontSize: 16 }} />}
                                                </Avatar>

                                                {/* Stop Details */}
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, noWrap: true }}>
                                                        {item.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {isCustomer ? 'Customer' : 'Laundry Vendor'}
                                                    </Typography>
                                                </Box>

                                                {/* Status Badge */}
                                                {item.isNew && (
                                                    <Chip 
                                                        label="New" 
                                                        size="small" 
                                                        color="success"
                                                        variant="filled"
                                                        sx={{ 
                                                            height: 18, 
                                                            fontSize: '0.65rem',
                                                            fontWeight: 600,
                                                            px: 0.5
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        );
                                    })}
                                    {sequencingPoints.length === 0 && (
                                        <Box py={5} textAlign="center" sx={{ border: '1.5px dashed', borderColor: 'divider', borderRadius: '8px', bgcolor: 'background.paper' }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No stops to sequence.
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                
                <DialogActions sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: 'divider', gap: 1 }}>
                    {step === 1 ? (
                        <>
                            <Button 
                                onClick={onClose} 
                                disabled={loading} 
                                variant="text"
                                sx={{ 
                                    color: 'text.secondary',
                                    fontWeight: 600,
                                    px: 2,
                                    height: 36,
                                    borderRadius: '6px',
                                    textTransform: 'none',
                                    fontSize: '0.825rem',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                        color: 'text.primary'
                                    }
                                }}
                            >
                                Cancel
                            </Button>
                            <GreenButton
                                onClick={handleGoToSequencing}
                                disabled={!hasChanges || loading}
                                sx={{
                                    height: 36,
                                    px: 2.5,
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '0.825rem',
                                    transition: 'all 0.2s ease',
                                    '&:active': {
                                        transform: 'scale(0.98)'
                                    }
                                }}
                            >
                                Next: Sequence Stops
                            </GreenButton>
                        </>
                    ) : (
                        <>
                            <Button 
                                onClick={() => setStep(1)} 
                                disabled={loading} 
                                variant="text"
                                sx={{ 
                                    color: 'text.secondary',
                                    fontWeight: 600,
                                    px: 2,
                                    height: 36,
                                    borderRadius: '6px',
                                    textTransform: 'none',
                                    fontSize: '0.825rem',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                        color: 'text.primary'
                                    }
                                }}
                            >
                                Back
                            </Button>
                            <GreenButton
                                onClick={handleAssign}
                                disabled={loading}
                                sx={{
                                    height: 36,
                                    px: 2.5,
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '0.825rem',
                                    transition: 'all 0.2s ease',
                                    '&:active': {
                                        transform: 'scale(0.98)'
                                    }
                                }}
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                            >
                                {loading ? 'Saving...' : 'Confirm & Save'}
                            </GreenButton>
                        </>
                    )}
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
