import {
    Box,
    Typography,
    ButtonGroup,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Autocomplete,
    Checkbox,
    IconButton,
    Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

const ORDER_TRIP = "ORDER_TRIP";
const WASH_TRIP = "WASH_TRIP";

export default function TripDetailsForm({
    isCustomerTrip,
    handleTripTypeChange,
    dcid,
    warehouses,
    selectedRoute,
    routes,
    setSelectedRoute,
    submitAttempted,
    deliveryDate,
    setDeliveryDate,
    drivers,
    selectedDriverIds,
    setSelectedDriverIds,
    rolesByUserId,
    setRolesByUserId,
    vehicle,
    setVehicle,
    vehicles,
    notes,
    setNotes,
    customers,
    vendors,
}) {
    return (
        <Box
            sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                bgcolor: "background.paper",
            }}
        >
            <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, mb: 1 }}
            >
                Trip Details
            </Typography>

            <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2 }}>
                    Select Trip Type
                </Typography>
                <ButtonGroup fullWidth size="small" variant="outlined">
                    <Button
                        onClick={() => handleTripTypeChange(ORDER_TRIP)}
                        sx={(theme) => ({ 
                            bgcolor: isCustomerTrip ? `${theme.palette.primary.main}14` : 'white',
                            color: isCustomerTrip ? 'primary.main' : 'text.secondary',
                            borderColor: isCustomerTrip ? 'primary.main !important' : 'divider !important',
                            zIndex: isCustomerTrip ? 2 : 1,
                            fontWeight: isCustomerTrip ? 700 : 500,
                            textTransform: 'none',
                            py: 1,
                            '&:hover': {
                                bgcolor: isCustomerTrip ? `${theme.palette.primary.main}1F` : 'rgba(0,0,0,0.04)',
                                borderColor: isCustomerTrip ? 'primary.main !important' : 'divider !important',
                            }
                        })}
                    >
                        Customer Trip
                    </Button>
                    <Button
                        onClick={() => handleTripTypeChange(WASH_TRIP)}
                        sx={(theme) => ({ 
                            bgcolor: !isCustomerTrip ? `${theme.palette.primary.main}14` : 'white',
                            color: !isCustomerTrip ? 'primary.main' : 'text.secondary',
                            borderColor: !isCustomerTrip ? 'primary.main !important' : 'divider !important',
                            zIndex: !isCustomerTrip ? 2 : 1,
                            fontWeight: !isCustomerTrip ? 700 : 500,
                            textTransform: 'none',
                            py: 1,
                            '&:hover': {
                                bgcolor: !isCustomerTrip ? `${theme.palette.primary.main}1F` : 'rgba(0,0,0,0.04)',
                                borderColor: !isCustomerTrip ? 'primary.main !important' : 'divider !important',
                            }
                        })}
                    >
                        Laundry Trip
                    </Button>
                </ButtonGroup>
            </Box>

            <FormControl fullWidth margin="dense" disabled>
                <InputLabel>Warehouse</InputLabel>
                <Select value={dcid ?? ""} label="Warehouse" disabled>
                    {warehouses.map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                            {w.name || `Warehouse ${w.id}`}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
            >
                Choose route, date, delivery team and vehicle for your <strong>{isCustomerTrip ? 'Order Trip' : 'Wash Trip'}</strong>.
            </Typography>

            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                }}
            >
                {/* Route */}
                <TextField
                    select
                    label="Route"
                    size="small"
                    value={selectedRoute?.id ?? ""}
                    onChange={(e) => {
                        const v = routes.find(
                            (r) => r.id === Number(e.target.value)
                        );
                        setSelectedRoute(v || null);
                    }}
                    required
                    error={submitAttempted && !selectedRoute}
                    helperText={submitAttempted && !selectedRoute ? "Route is required" : ""}
                >
                    {routes.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                            {r.name}
                        </MenuItem>
                    ))}
                </TextField>

                {/* Date */}
                <Box sx={{ display: "flex", gap: 1 }}>
                    <DatePicker
                        label="Delivery Date"
                        value={deliveryDate}
                        onChange={(d) => setDeliveryDate(d)}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                size: "small",
                                required: true,
                                error: submitAttempted && !deliveryDate,
                                helperText:
                                    submitAttempted && !deliveryDate
                                        ? "Delivery Date is required"
                                        : undefined,
                            },
                        }}
                    />
                </Box>

                {/* Delivery Team */}
                <Autocomplete
                    multiple
                    options={drivers}
                    getOptionLabel={(o) => o?.name || String(o?.id || '')}
                    value={(selectedDriverIds || []).map((id) => drivers.find((d) => d.id === id)).filter(Boolean)}
                    disableClearable
                    slotProps={{
                        listbox: {
                            sx: {
                                p: 0,
                                '& .MuiAutocomplete-option': {
                                    minHeight: 'auto',
                                    py: 0.5,
                                    px: 1,
                                    fontSize: '0.9rem',
                                },
                            },
                        },
                        paper: { sx: { mt: 0.5 } },
                    }}
                    onChange={(_, val) => {
                        const ids = (val || []).map((v) => v.id);
                        setSelectedDriverIds(ids);
                        const next = { ...rolesByUserId };
                        ids.forEach((uid, idx) => {
                            if (!next[uid]) next[uid] = idx === 0 ? 'DRIVER' : 'HELPER';
                        });
                        Object.keys(next).forEach((uid) => {
                            if (!ids.includes(Number(uid)) && !ids.includes(uid)) delete next[uid];
                        });
                        setRolesByUserId(next);
                    }}
                    disableCloseOnSelect
                    renderOption={(props, option, { selected }) => (
                        <li {...props} key={option.id} style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 8 }}>
                            <Checkbox size="small" style={{ marginRight: 6 }} checked={selected} />
                            {option.name}
                        </li>
                    )}
                    renderTags={(value) => {
                        const text = (value || []).map((u) => u?.name).filter(Boolean).join(', ');
                        return (
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    flexWrap: 'nowrap',
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    maxWidth: '100%',
                                    whiteSpace: 'nowrap',
                                    scrollbarWidth: 'thin',
                                }}
                            >
                                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{text}</Typography>
                            </Box>
                        );
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Delivery Team"
                            size="small"
                            required
                            error={submitAttempted && (!selectedDriverIds || selectedDriverIds.length === 0)}
                            helperText={submitAttempted && (!selectedDriverIds || selectedDriverIds.length === 0) ? 'At least one team member is required' : ''}
                        />
                    )}
                    fullWidth
                    sx={{
                        '& .MuiInputBase-root': {
                            position: 'relative',
                            alignItems: 'center',
                            minHeight: 44,
                            pt: 0.5,
                            pb: 0.5,
                            pr: '56px',
                        },
                        // Prevent multiline by keeping input root on one line
                        '& .MuiAutocomplete-inputRoot': {
                            flexWrap: 'nowrap',
                        },
                        '& .MuiChip-root': { height: 24, m: 0.25 },
                        '& .MuiAutocomplete-input': {
                            py: 0.5,
                            minWidth: 8,
                            flex: '0 0 auto',
                        },
                    }}
                />

                {/* Role pickers per selected driver */}
                {selectedDriverIds && selectedDriverIds.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        {selectedDriverIds.map((uid, idx) => {
                            const user = drivers.find((d) => d.id === uid);
                            const role = rolesByUserId[uid] || (idx === 0 ? 'DRIVER' : 'HELPER');
                            return (
                                <Box key={uid} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                    <Typography sx={{ minWidth: 140 }}>{user?.name || uid}</Typography>
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Role</InputLabel>
                                        <Select
                                            label="Role"
                                            value={role}
                                            onChange={(e) => setRolesByUserId((prev) => ({ ...prev, [uid]: e.target.value }))}
                                        >
                                            <MenuItem value="DRIVER">DRIVER</MenuItem>
                                            <MenuItem value="HELPER">HELPER</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <IconButton
                                        aria-label="Remove team member"
                                        size="small"
                                        onClick={() => {
                                            setSelectedDriverIds((prev) => prev.filter((id) => id !== uid));
                                            setRolesByUserId((prev) => {
                                                const n = { ...prev };
                                                delete n[uid];
                                                return n;
                                            });
                                        }}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            )
                        })}
                    </Box>
                )}

                {/* Vehicle */}
                <TextField
                    select
                    label="Vehicle"
                    size="small"
                    value={vehicle?.id ?? ""}
                    onChange={(e) => {
                        const v = vehicles.find(
                            (v) => v.id === Number(e.target.value)
                        );
                        setVehicle(v || null);
                    }}
                    required
                    error={submitAttempted && !vehicle}
                    helperText={
                        submitAttempted && !vehicle
                            ? "Vehicle is required"
                            : vehicle
                                ? "Vehicle reserved for this trip"
                                : ""
                    }
                >
                    <MenuItem value="">—</MenuItem>
                    {vehicles.map((v) => (
                        <MenuItem key={v.id} value={v.id}>
                            {v.vehicleNumber}
                            {v.type ? ` — ${v.type}` : ""}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Trip Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Any instructions for this trip (optional)"
                />

                {selectedRoute && (
                    <Box sx={{ mt: 1 }}>
                        <Typography
                            variant="subtitle2"
                            sx={{ mb: 0.75, fontWeight: 700 }}
                        >
                            {isCustomerTrip ? 'Customers' : 'Vendors'} in “{selectedRoute.name}”
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.75,
                                p: 1,
                                border: "1px dashed",
                                borderColor: "divider",
                                borderRadius: 1,
                                bgcolor: "background.default",
                                maxHeight: 140,
                                overflow: "auto",
                            }}
                        >
                            {(isCustomerTrip ? customers : vendors).map((p) => (
                                <Chip
                                    key={p.id}
                                    label={p.name}
                                    size="small"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            {isCustomerTrip ? customers.length : vendors.length} {isCustomerTrip ? 'customers' : 'vendors'} on this route
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
