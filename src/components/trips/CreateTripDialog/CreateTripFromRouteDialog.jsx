import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Chip,
} from "@mui/material";
import CustomerOrdersSection from "./CustomerOrdersSection";
import VendorWashRequestsSection from "./VendorWashRequestsSection";
import TripDetailsForm from "./TripDetailsForm";
import TripSummaryActions from "./TripSummaryActions";
import useCreateTripDialog from "../../../hooks/useCreateTripDialog";

export default function CreateTripFromRouteDialog({
    open,
    onClose,
    onCreated,
}) {
    const tripState = useCreateTripDialog({ open, onClose, onCreated });

    const {
        isCustomerTrip,
        tripType,
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
        enabledCustomers,
        enabledVendors,
        selectedOrdersCount,
        selectedWashRequestsCount,
        orders,
        washRequests,
        loadingOrders,
        loadingWashRequests,
        ordersError,
        toggleCustomerEnabled,
        toggleOrderSelection,
        toggleVendorEnabled,
        toggleWashRequestSelection,
        handleCreate,
        resetStateAndClose,
        customersWithOrders,
        vendorsWithWashRequests,
        filteredGroupedOrdersByCustomer,
        groupedWashRequestsByVendor,
        selectedOrderIdsByCustomer,
        selectedWashRequestIdsByVendor,
        visitNotesByCustomer,
        setVisitNotesByCustomer,
        visitNotesByVendor,
        setVisitNotesByVendor,
        moveCustomerUp,
        moveCustomerDown,
        handleCustomerDrop,
        moveVendorUp,
        moveVendorDown,
        handleVendorDrop,
    } = tripState;

    return (
        <Dialog
            open={open}
            onClose={resetStateAndClose}
            fullWidth
            maxWidth="lg"
        >
            <DialogTitle sx={{ pb: 0.5 }}>
                <Typography variant="h6">Create Trip (New)</Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ pt: 2 }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
                        gap: 2,
                        alignItems: "start",
                    }}
                >
                    <TripDetailsForm
                        isCustomerTrip={isCustomerTrip}
                        handleTripTypeChange={handleTripTypeChange}
                        dcid={dcid}
                        warehouses={warehouses}
                        selectedRoute={selectedRoute}
                        routes={routes}
                        setSelectedRoute={setSelectedRoute}
                        submitAttempted={submitAttempted}
                        deliveryDate={deliveryDate}
                        setDeliveryDate={setDeliveryDate}
                        drivers={drivers}
                        selectedDriverIds={selectedDriverIds}
                        setSelectedDriverIds={setSelectedDriverIds}
                        rolesByUserId={rolesByUserId}
                        setRolesByUserId={setRolesByUserId}
                        vehicle={vehicle}
                        setVehicle={setVehicle}
                        vehicles={vehicles}
                        notes={notes}
                        setNotes={setNotes}
                        customers={customers}
                        vendors={vendors}
                    />

                    {/* RIGHT: ORDERS / WASH REQUESTS ACCORDIONS */}
                    <Box>
                        <Box sx={{ borderBottom: 1, borderColor: "divider", pb: 1, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                             <Typography variant="subtitle1" sx={{ fontWeight: 700, px: 1 }}>
                                {isCustomerTrip ? `Pending Orders (${selectedOrdersCount})` : `Pending Wash Requests (${selectedWashRequestsCount})`}
                             </Typography>
                             <Box sx={{ px: 1 }}>
                                {isCustomerTrip ? (
                                    <Chip label={`${orders.length} Available`} size="small" variant="outlined" color="primary" />
                                ) : (
                                    <Chip label={`${washRequests.length} Available`} size="small" variant="outlined" color="secondary" />
                                )}
                             </Box>
                        </Box>

                        {isCustomerTrip && selectedRoute && (
                             <CustomerOrdersSection
                                customers={customers}
                                customersWithOrders={customersWithOrders}
                                enabledCustomers={enabledCustomers}
                                toggleCustomerEnabled={toggleCustomerEnabled}
                                filteredGroupedOrdersByCustomer={filteredGroupedOrdersByCustomer}
                                selectedOrderIdsByCustomer={selectedOrderIdsByCustomer}
                                toggleOrderSelection={toggleOrderSelection}
                                visitNotesByCustomer={visitNotesByCustomer}
                                setVisitNotesByCustomer={setVisitNotesByCustomer}
                                orders={orders}
                                loadingOrders={loadingOrders}
                                ordersError={ordersError}
                                moveCustomerUp={moveCustomerUp}
                                moveCustomerDown={moveCustomerDown}
                                handleCustomerDrop={handleCustomerDrop}
                            />
                        )}

                        {!isCustomerTrip && selectedRoute && (
                             <VendorWashRequestsSection
                                vendors={vendors}
                                vendorsWithWashRequests={vendorsWithWashRequests}
                                enabledVendors={enabledVendors}
                                toggleVendorEnabled={toggleVendorEnabled}
                                groupedWashRequestsByVendor={groupedWashRequestsByVendor}
                                selectedWashRequestIdsByVendor={selectedWashRequestIdsByVendor}
                                toggleWashRequestSelection={toggleWashRequestSelection}
                                visitNotesByVendor={visitNotesByVendor}
                                setVisitNotesByVendor={setVisitNotesByVendor}
                                washRequests={washRequests}
                                loadingWashRequests={loadingWashRequests}
                                moveVendorUp={moveVendorUp}
                                moveVendorDown={moveVendorDown}
                                handleVendorDrop={handleVendorDrop}
                            />
                        )}
                    </Box>
                </Box>
            </DialogContent>

            <TripSummaryActions
                enabledCustomers={enabledCustomers}
                enabledVendors={enabledVendors}
                selectedOrdersCount={selectedOrdersCount}
                selectedWashRequestsCount={selectedWashRequestsCount}
                isCustomerTrip={isCustomerTrip}
                tripType={tripType}
                selectedDriverIds={selectedDriverIds}
                drivers={drivers}
                rolesByUserId={rolesByUserId}
                vehicle={vehicle}
                resetStateAndClose={resetStateAndClose}
                selectedRoute={selectedRoute}
                deliveryDate={deliveryDate}
                handleCreate={handleCreate}
            />
        </Dialog>
    );
}