import React, { useMemo, useState } from "react";
import {
    Box,
    Typography,
    Checkbox,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    Alert,
    Skeleton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DataTable from "../../common/tables/DataTable";
import { DATE_ONLY, formatCustomDate } from "../../../utils/dateUtils";

const CustomerRowSummary = React.memo(({
    customer,
    isEnabled,
    toggleCustomerEnabled,
    visibleOrdersCount,
    visitNoteValue,
    setVisitNotesByCustomer,
    
    // Reordering
    index,
    setIsDraggable,
}) => {
    const customerId = Number(customer.id);
    return (
        <Box sx={{ width: '100%', opacity: isEnabled ? 1 : 0.6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                    
                    {/* 6-dot drag handle */}
                    <Box 
                        sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            cursor: isEnabled ? 'grab' : 'default', 
                            color: 'text.secondary',
                            opacity: isEnabled ? 0.6 : 0.2,
                            '&:active': { cursor: isEnabled ? 'grabbing' : 'default' }
                        }}
                    >
                        <Typography sx={{ mr: 0.5, fontWeight: 500, fontSize: '14px', color: 'text.secondary' }}>
                            {index + 1}.
                        </Typography>
                        <DragIndicatorIcon sx={{ fontSize: '20px' }} />
                    </Box>

                    {/* Blue checkbox icon next to title */}
                    <Box
                        onMouseEnter={() => setIsDraggable(false)}
                        onMouseLeave={() => setIsDraggable(true)}
                        sx={{ display: 'inline-flex' }}
                    >
                        <Tooltip title={isEnabled ? "Exclude this customer" : "Include this customer"}>
                            <Checkbox 
                                data-agent-field="selected"
                                size="small" 
                                checked={isEnabled} 
                                onChange={() => toggleCustomerEnabled(customerId)} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            />
                        </Tooltip>
                    </Box>

                    {/* Title Text */}
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {customer.name}
                    </Typography>

                     {/* Orange requests badge */}
                    <Box sx={{
                        border: '1px solid #fdb574',
                        bgcolor: '#fff7ed',
                        color: '#ed6c02',
                        borderRadius: '16px',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center'
                    }}>
                        {visibleOrdersCount} orders
                    </Box>

                    </Box>
                <Box
                    onMouseEnter={() => setIsDraggable(false)}
                    onMouseLeave={() => setIsDraggable(true)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ width: '45%', flexShrink: 0 }}
                >
                        <TextField
                            data-agent-field="visitNotes"
                            value={visitNoteValue || ""}
                            onChange={(e) => setVisitNotesByCustomer(prev => ({ ...prev, [customerId]: e.target.value }))}
                            size="small"
                            placeholder="Add visit notes..."
                            fullWidth
                            disabled={!isEnabled}
                            multiline
                            minRows={1}
                            sx={{
                                '& .MuiInputBase-root': {
                                    height: 'auto !important',
                                },
                                '& .MuiInputBase-input': {
                                    fontSize: '14px',
                                    color: 'text.primary',
                                }
                            }}
                        />
                </Box>
            </Box>
        </Box>
    );
});

const CustomerAccordionItem = React.memo(({
    customer,
    isEnabled,
    visibleOrders,
    selectedSet,
    toggleCustomerEnabled,
    toggleOrderSelection,
    visitNoteValue,
    setVisitNotesByCustomer,
    
    // Reordering
    index,
    onDrop,
}) => {
    const customerId = Number(customer.id);
    const [isDraggable, setIsDraggable] = useState(true);

    const [isDragging, setIsDragging] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const decoratedRows = useMemo(() => {
        return visibleOrders.map((o) => ({
            ...o,
            _selected: selectedSet.has(o.id),
        }));
    }, [visibleOrders, selectedSet]);

    const orderColumns = useMemo(() => [
        {
            field: "pick",
            headerName: "Pick",
            width: 40,
            stopPropagation: true,
            render: (_, row) => (
                <Checkbox
                    size="small"
                    checked={Boolean(row._selected)}
                    onChange={() => toggleOrderSelection(customerId, row.id)}
                    disabled={!isEnabled}
                />
            ),
        },
        {
            field: "orderType",
            headerName: "Type",
            type: "smallText",
            render: (val) => (
                <Typography sx={{ fontWeight: 600 }}>{val || "-"}</Typography>
            ),
        },
        {
            field: "referenceNumber",
            headerName: "Order Ref",
            type: "longText",
            isPrimary: false
        },
        {
            field: "status",
            headerName: "Status",
            type: "text",
            render: (val) => {
                const status = String(val || "").toUpperCase();
                let label = val || "-";
                let color = "default";

                if (status === "PENDING" || status === "CREATED") {
                    label = "PENDING";
                    color = "warning";
                } else if (status === "IN_PROGRESS" || status === "PARTIALLY_COMPLETED") {
                    label = "IN PROGRESS";
                    color = "info";
                }

                return <Typography
                    sx={{
                        color: color === "warning" ? "warning.main" : color === "info" ? "info.main" : "text.secondary"
                    }}
                >
                    {label}
                </Typography>;
            }
        },
        {
            field: "orderDate",
            headerName: "Date",
            type: "smallText",
            render: (val, row) => (
                <Typography>{row.orderDate ? formatCustomDate(row.orderDate, DATE_ONLY) : "-"}</Typography>
            ),
        },
    ], [customerId, isEnabled, toggleOrderSelection]);

    return (
        <Accordion
            data-agent-row-customer={String(customerId)}
            disableGutters
            square={false}
            draggable={isEnabled && isDraggable}
            onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(customerId));
                // Defer changing state so the browser screenshots the card in its normal resting state first
                setTimeout(() => {
                    setIsDragging(true);
                }, 0);
            }}
            onDragEnd={() => {
                setIsDragging(false);
                setIsDragOver(false);
            }}
            onDragEnter={(e) => {
                e.preventDefault();
                if (isEnabled) setIsDragOver(true);
            }}
            onDragLeave={() => {
                setIsDragOver(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                setIsDragOver(false);
                const draggedId = Number(e.dataTransfer.getData("text/plain"));
                if (draggedId !== customerId) {
                    onDrop(draggedId, customerId);
                }
            }}
            sx={{
                position: "relative",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px !important",
                bgcolor: isDragOver ? "#FFF7ED" : "background.paper",
                outline: isDragOver ? "2px solid #E97316" : "none",
                outlineOffset: "-2px",
                boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0, 0, 0, 0.05)",
                overflow: "hidden",
                opacity: isDragging ? 0.5 : 1,
                transform: isDragging ? "scale(0.98)" : "scale(1)",
                transition: "opacity 0.15s, transform 0.15s, background-color 0.15s, outline 0.15s",
                "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "3px",
                    bgcolor: "#ed6c02", // Orange left stripe accent
                    zIndex: 2,
                    borderRadius: "8px 0 0 8px",
                },
                "&:before": {
                    display: "none",
                },
                "&:hover": { 
                    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "0 4px 12px rgba(0, 0, 0, 0.08)" 
                },
            }}
        >
            <AccordionSummary 
                disableRipple
                expandIcon={
                    <Box sx={{ 
                        p: 0.75, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: '8px', 
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <ExpandMoreIcon fontSize="small" sx={{ fontSize: '16px' }} />
                    </Box>
                }
                sx={{
                    px: 2,
                    py: 1,
                    minHeight: 'auto',
                    backgroundColor: 'transparent !important',
                    '&:hover': {
                        backgroundColor: 'transparent !important',
                    },
                    '&.Mui-focusVisible': {
                        backgroundColor: 'transparent !important',
                    },
                    '&.Mui-focused': {
                        backgroundColor: 'transparent !important',
                    },
                    '&.Mui-expanded': {
                        backgroundColor: 'transparent !important',
                    },
                    '& .MuiAccordionSummary-content': {
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                    },
                    '& .MuiAccordionSummary-expandIconWrapper': {
                        transition: 'transform 0.2s',
                        marginLeft: '8px',
                    },
                }}
            >
                <CustomerRowSummary
                    customer={customer}
                    isEnabled={isEnabled}
                    toggleCustomerEnabled={toggleCustomerEnabled}
                    visibleOrdersCount={visibleOrders.length}
                    visitNoteValue={visitNoteValue}
                    setVisitNotesByCustomer={setVisitNotesByCustomer}
                    
                    index={index}
                    setIsDraggable={setIsDraggable}
                />
            </AccordionSummary>

            <AccordionDetails 
                sx={{ bgcolor: "background.default", pt: 1 }}
                onMouseEnter={() => setIsDraggable(false)}
                onMouseLeave={() => setIsDraggable(true)}
            >
                {visibleOrders.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                        {isEnabled
                            ? "No orders for current filters. You can still schedule a visit without orders."
                            : "Customer excluded. Enable to view and pick orders."}
                    </Typography>
                ) : (
                    <DataTable
                        columns={orderColumns}
                        rows={decoratedRows}
                        expandable={true}
                        containerSx={{ '& .MuiTableCell-root, & .MuiTypography-root': { fontSize: '13px' } }}
                    />
                )}
            </AccordionDetails>
        </Accordion>
    );
});

export default function CustomerOrdersSection({
    customers,
    customersWithOrders,
    enabledCustomers,
    toggleCustomerEnabled,
    filteredGroupedOrdersByCustomer,
    selectedOrderIdsByCustomer,
    toggleOrderSelection,
    visitNotesByCustomer,
    setVisitNotesByCustomer,
    orders,
    loadingOrders,
    ordersError,
    
    // Reordering
    handleCustomerDrop,
}) {
    if (loadingOrders) {
        return (
            <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={40} />
                ))}
            </Box>
        );
    }

    if (ordersError) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {ordersError}
            </Alert>
        );
    }

    if (customers.length === 0) {
        return (
            <Alert severity="info">
                No customers on the selected route.
            </Alert>
        );
    }

    if (orders.length === 0) {
        return (
            <Box sx={{ p: 3, border: "1px dashed", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                    No orders found for the selected date. You can still create a trip with customers only.
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "grid",
                gap: 1,
                maxHeight: 520,
                overflow: "auto",
                pr: 0.5,
            }}
        >
            {customersWithOrders.map((customer, idx) => {
                const customerId = Number(customer.id);
                return (
                    <CustomerAccordionItem
                        key={customerId}
                        customer={customer}
                        isEnabled={enabledCustomers.has(customerId)}
                        visibleOrders={filteredGroupedOrdersByCustomer[customerId] || []}
                        selectedSet={selectedOrderIdsByCustomer[customerId] || new Set()}
                        toggleCustomerEnabled={toggleCustomerEnabled}
                        toggleOrderSelection={toggleOrderSelection}
                        visitNoteValue={visitNotesByCustomer[customerId]}
                        setVisitNotesByCustomer={setVisitNotesByCustomer}
                        
                        index={idx}
                        onDrop={handleCustomerDrop}
                    />
                );
            })}
        </Box>
    );
}
