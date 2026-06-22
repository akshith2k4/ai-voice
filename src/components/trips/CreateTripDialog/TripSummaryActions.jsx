import { DialogActions, Box, Chip, Button, Tooltip } from "@mui/material";

export default function TripSummaryActions({
    enabledCustomers,
    enabledVendors,
    selectedOrdersCount,
    selectedWashRequestsCount,
    isCustomerTrip,
    tripType,
    selectedDriverIds,
    drivers,
    rolesByUserId,
    vehicle,
    resetStateAndClose,
    selectedRoute,
    deliveryDate,
    handleCreate,
}) {
    const isTeamEmpty = !selectedDriverIds || selectedDriverIds.length === 0;
    const hasRequiredFields = selectedRoute && deliveryDate && vehicle && !isTeamEmpty;

    return (
        <DialogActions
            sx={{
                position: { md: "sticky" },
                bottom: 0,
                zIndex: 1,
                bgcolor: "background.paper",
                borderTop: "1px solid",
                borderColor: "divider",
                py: 1,
                px: 2,
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    alignItems: "center",
                }}
            >
                <Chip
                    color="primary"
                    variant="outlined"
                    label={`Customers: ${enabledCustomers.size}`}
                    size="small"
                />
                <Chip
                    color="secondary"
                    variant="outlined"
                    label={`Vendors: ${enabledVendors.size}`}
                    size="small"
                />
                <Chip
                    color="primary"
                    variant="outlined"
                    label={`Orders: ${selectedOrdersCount}`}
                    size="small"
                />
                <Chip
                    color="secondary"
                    variant="outlined"
                    label={`Wash Req: ${selectedWashRequestsCount}`}
                    size="small"
                />
                <Chip
                    color={isCustomerTrip ? "primary" : "secondary"}
                    variant="outlined"
                    label={`Trip Type: ${tripType}`}
                    size="small"
                />
                {selectedDriverIds && selectedDriverIds.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selectedDriverIds.map((uid) => {
                            const user = drivers.find((d) => d.id === uid);
                            const role = rolesByUserId[uid] || 'DRIVER';
                            return (
                                <Chip key={uid} label={`${user?.name || uid} — ${role}`} size="small" />
                            );
                        })}
                    </Box>
                )}
                {vehicle && (
                    <Chip
                        label={`Vehicle: ${vehicle.vehicleNumber}${vehicle.type ? ` — ${vehicle.type}` : ""}`}
                        size="small"
                    />
                )}
            </Box>

            <Button onClick={resetStateAndClose} color="secondary">
                Cancel
            </Button>
            <Tooltip
                title={
                    !hasRequiredFields
                        ? "Route, Delivery Date, at least one Delivery Team member, and Vehicle are required"
                        : ""
                }
            >
                <span>
                    <Button onClick={handleCreate} variant="contained">
                        Create Trip
                    </Button>
                </span>
            </Tooltip>
        </DialogActions>
    );
}
