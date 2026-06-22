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
    IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DataTable from "../../common/tables/DataTable";
import { DATE_ONLY, formatCustomDate } from "../../../utils/dateUtils";

const VendorRowSummary = React.memo(({
    vendor,
    isEnabled,
    toggleVendorEnabled,
    visibleWRCount,
    visitNoteValue,
    setVisitNotesByVendor,
    
    // Reordering
    index,
    setIsDraggable,
}) => {
    const vendorId = Number(vendor.id);
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
                        <Tooltip title={isEnabled ? "Exclude this vendor" : "Include this vendor"}>
                            <Checkbox 
                                size="small" 
                                checked={isEnabled} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                onChange={() => toggleVendorEnabled(vendorId)}
                            />
                        </Tooltip>
                    </Box>

                    {/* Title Text */}
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {vendor.name}
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
                        {visibleWRCount} requests
                    </Box>

                    </Box>

                <Box
                    onMouseEnter={() => setIsDraggable(false)}
                    onMouseLeave={() => setIsDraggable(true)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ width: '45%', flexShrink: 0 }}
                >
                        <TextField
                            value={visitNoteValue || ""}
                            onChange={(e) => setVisitNotesByVendor(prev => ({ ...prev, [vendorId]: e.target.value }))}
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

const VendorAccordionItem = React.memo(({
    vendor,
    isEnabled,
    rawVisibleWR,
    selectedSet,
    toggleVendorEnabled,
    toggleWashRequestSelection,
    visitNoteValue,
    setVisitNotesByVendor,
    
    // Reordering
    index,
    onDrop,
}) => {
    const vendorId = Number(vendor.id);
    const [isDraggable, setIsDraggable] = useState(true);

    const [isDragging, setIsDragging] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const visibleWR = useMemo(() => {
        return [...rawVisibleWR].sort((a, b) => {
            const aPending = String(a.status || "").toUpperCase() === "PENDING" ? 0 : 1;
            const bPending = String(b.status || "").toUpperCase() === "PENDING" ? 0 : 1;
            return aPending - bPending;
        });
    }, [rawVisibleWR]);

    const decoratedRows = useMemo(() => {
        return visibleWR.map(w => ({ ...w, _selected: selectedSet.has(w.id) }));
    }, [visibleWR, selectedSet]);

    const wrColumns = useMemo(() => [
        {
            field: "pick",
            headerName: "Pick",
            width: 40,
            stopPropagation: true,
            render: (_, row) => (
                <Checkbox
                    size="small"
                    checked={Boolean(row._selected)}
                    onChange={() => toggleWashRequestSelection(vendorId, row.id)}
                    disabled={!isEnabled}
                />
            ),
        },
        {
            field: "washRequestType",
            headerName: "Pool Name",
            type: "text",
            render: (val, row) => {
                let label = val === "RE_WASH" ? `${row?.referenceName} (Rewash)` : `${row?.referenceName}`;
                return <Typography sx={{ fontWeight: 600 }}>{label}</Typography>;
            }
        },
        {
            field: "requestNumber",
            headerName: "WR Number",
            type: "smallNumber",
            isPrimary: false,
            render: (val, row) => (
                <Typography sx={{ fontWeight: 500 }}>{val || row.id}</Typography>
            ),
        },
        {
            field: "status",
            headerName: "Status",
            type: "text",
            render: (val) => {
                const status = String(val || "").toUpperCase();
                let label = val || "-";
                let color = "default";

                if (status === "PENDING") {
                    label = "DELIVERY PENDING";
                    color = "warning";
                } else if (status === "PARTIALLY_COMPLETED" || status === "IN_PROGRESS") {
                    label = "PICKUP PENDING";
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
            field: "createdDate",
            headerName: "Date",
            type: "smallText",
            render: (val, row) => (
                <Typography>{formatCustomDate(row.createdDate || row.washRequestRecordedDate, DATE_ONLY)}</Typography>
            ),
        },
    ], [vendorId, isEnabled, toggleWashRequestSelection]);

    return (
        <Accordion 
            disableGutters 
            square={false} 
            draggable={isEnabled && isDraggable}
            onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(vendorId));
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
                if (draggedId !== vendorId) {
                    onDrop(draggedId, vendorId);
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
                    borderRadius: "8px 0 0 8px"
                }, 
                "&:before": { display: "none" }, 
                "&:hover": { 
                    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "0 4px 12px rgba(0, 0, 0, 0.08)" 
                } 
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
                <VendorRowSummary
                    vendor={vendor}
                    isEnabled={isEnabled}
                    toggleVendorEnabled={toggleVendorEnabled}
                    visibleWRCount={visibleWR.length}
                    visitNoteValue={visitNoteValue}
                    setVisitNotesByVendor={setVisitNotesByVendor}
                    
                    index={index}
                    setIsDraggable={setIsDraggable}
                />
            </AccordionSummary>
            <AccordionDetails 
                sx={{ bgcolor: "background.default", pt: 1 }}
                onMouseEnter={() => setIsDraggable(false)}
                onMouseLeave={() => setIsDraggable(true)}
            >
                {visibleWR.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>{isEnabled ? "No wash requests. You can still schedule a visit." : "Vendor excluded."}</Typography>
                ) : (
                    <DataTable
                        columns={wrColumns}
                        rows={decoratedRows}
                        expandable={true}
                        containerSx={{ '& .MuiTableCell-root, & .MuiTypography-root': { fontSize: '13px' } }}
                    />
                )}
            </AccordionDetails>
        </Accordion>
    );
});

export default function VendorWashRequestsSection({
    vendors,
    vendorsWithWashRequests,
    enabledVendors,
    toggleVendorEnabled,
    groupedWashRequestsByVendor,
    selectedWashRequestIdsByVendor,
    toggleWashRequestSelection,
    visitNotesByVendor,
    setVisitNotesByVendor,
    washRequests,
    loadingWashRequests,
    
    // Reordering
    handleVendorDrop,
}) {
    if (loadingWashRequests) {
        return (
            <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={60} />
                ))}
            </Box>
        );
    }

    if (vendors.length === 0) {
        return (
            <Alert severity="info">
                No vendors on the selected route.
            </Alert>
        );
    }

    if (washRequests.length === 0) {
        return (
            <Box sx={{ p: 3, border: "1px dashed", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                    No wash requests found for the selected date. You can still schedule vendor visits.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "grid", gap: 1, maxHeight: 520, overflow: "auto", pr: 0.5 }}>
            {vendorsWithWashRequests.map((vendor, idx) => {
                const vendorId = Number(vendor.id);
                return (
                    <VendorAccordionItem
                        key={vendorId}
                        vendor={vendor}
                        isEnabled={enabledVendors.has(vendorId)}
                        rawVisibleWR={groupedWashRequestsByVendor[vendorId] || []}
                        selectedSet={selectedWashRequestIdsByVendor[vendorId] || new Set()}
                        toggleVendorEnabled={toggleVendorEnabled}
                        toggleWashRequestSelection={toggleWashRequestSelection}
                        visitNoteValue={visitNotesByVendor[vendorId]}
                        setVisitNotesByVendor={setVisitNotesByVendor}
                        
                        index={idx}
                        onDrop={handleVendorDrop}
                    />
                );
            })}
        </Box>
    );
}
