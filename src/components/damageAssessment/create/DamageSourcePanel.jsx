import React, { useMemo } from "react";
import {
    Box,
    Typography,
    TextField,
    Autocomplete,
    MenuItem,
    CircularProgress,
    Stack,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Controller } from "react-hook-form";

import { useSearchCustomers, useSearchLaundryVendors } from "../../../hooks/useDamageAssessment";
import { DAMAGE_SOURCE, DAMAGE_SOURCE_TYPES } from "../../../constants/damageAssessment";

/**
 * Panel for selecting Source Type (Customer/Laundry) -> Entity -> Date -> specific Order/Fulfillment
 */
function DamageSourcePanel({
    control,
    isEdit,
    sourceType,
    reportedBy,
    sourceId,
    onCustomerSearchChange,
    customerSearchQuery,
    searchDate,
    setSearchDate,
    sourceOptions,
    sourceLoading,
    setValue,
    customerData = [],
    customerLoading = false,
    vendorData = [],
    vendorLoading = false
}) {
    // Queries removed and lifted to parent dialog for Agent Form registration hook

    // Helper to normalize vendor list
    const laundryVendors = useMemo(() => {
        return Array.isArray(vendorData) ? vendorData : (vendorData?.content || []);
    }, [vendorData]);

    // Labels
    const entityLabel = sourceType === DAMAGE_SOURCE.ORDER ? 'Order' : 'Wash Fulfillment';

    return (
        <Box
            sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2.5,
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Damage Request Details
            </Typography>

            <Stack spacing={{ xs: 1.5, md: 2 }}>
                {/* 0. Items Damage Request Date */}
                {/* 0. Items Damage Request Date */}
                <Controller
                    name="requestDate"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            label="Item Damage Request Date"
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isEdit}
                            slotProps={{ textField: { size: "small", fullWidth: true } }}
                        />
                    )}
                />

                {/* 1. Source Type - DROPDOWN */}
                <Controller
                    name="sourceType"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            select
                            label="Source Type"
                            fullWidth
                            size="small"
                            disabled={isEdit}
                            onChange={(e) => {
                                field.onChange(e);
                                setValue("reportedBy", "");
                                setValue("sourceId", "");
                                setValue("productId", "");
                            }}
                        >
                            {DAMAGE_SOURCE_TYPES.map((type) => (
                                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                            ))}
                        </TextField>
                    )}
                />

                {/* 2. Entity Selection (Customer OR Vendor) - Autocomplete (Standard for search) */}
                {sourceType === DAMAGE_SOURCE.ORDER && (
                    <Controller
                        name="reportedBy"
                        control={control}
                        rules={{ required: !isEdit }}
                        render={({ field }) => (
                            <Autocomplete
                                disabled={isEdit}
                                options={customerData}
                                loading={customerLoading}
                                getOptionLabel={(option) => option?.name || ""}
                                value={field.value ? (customerData.find(c => c.id === field.value) || { name: "Selected Customer", id: field.value }) : null}
                                onInputChange={(event, value, reason) => !isEdit && reason === "input" && onCustomerSearchChange(value)}
                                onChange={(event, value) => {
                                    field.onChange(value?.id || "");
                                    setValue("sourceId", "");
                                    setValue("productId", "");
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Search Customer"
                                        required={!isEdit}
                                        placeholder="Type name..."
                                        size="small"
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {customerLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        )}
                    />
                )}

                {sourceType === DAMAGE_SOURCE.WASH_FULFILLMENT && (
                    <Controller
                        name="reportedBy"
                        control={control}
                        rules={{ required: !isEdit }}
                        render={({ field }) => (
                            <Autocomplete
                                disabled={isEdit}
                                options={laundryVendors}
                                loading={vendorLoading}
                                getOptionLabel={(option) => option?.name || option?.laundryName || ""}
                                value={field.value ? (laundryVendors.find(v => v.id === field.value) || { name: "Selected Vendor", id: field.value }) : null}
                                onChange={(event, value) => {
                                    field.onChange(value?.id || "");
                                    setValue("sourceId", "");
                                    setValue("productId", "");
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Laundry Vendor"
                                        size="small"
                                        required={!isEdit}
                                    />
                                )}
                            />
                        )}
                    />
                )}

                {/* 3. Date Selection (Filtering) */}
                <DatePicker
                    label={sourceType === DAMAGE_SOURCE.ORDER ? "Order Date" : "Wash Date"}
                    value={searchDate}
                    onChange={(v) => {
                        setSearchDate(v);
                        setValue("sourceId", "");
                    }}
                    disabled={isEdit}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                />

                {/* 4. Results Selection - DROPDOWN (Matches CreateIssueDialog) */}
                {isEdit ? (
                    <TextField
                        fullWidth
                        size="small"
                        label={entityLabel}
                        value={sourceId ? `#${sourceId}` : ''}
                        disabled
                    />
                ) : (
                    <>
                        {sourceLoading ? (
                            <TextField select fullWidth size="small" label={`Select ${entityLabel}`} disabled>
                                <MenuItem disabled>Loading...</MenuItem>
                            </TextField>
                        ) : !reportedBy ? (
                            <TextField select fullWidth size="small" label={`Select ${entityLabel}`} disabled helperText={`Select ${sourceType === DAMAGE_SOURCE.ORDER ? 'Customer' : 'Vendor'} to load ${entityLabel.toLowerCase()}s`} />
                        ) : sourceOptions.length === 0 ? (
                            reportedBy && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block', mt: 1 }}>
                                    No {sourceType === DAMAGE_SOURCE.ORDER ? "orders" : "fulfillments"} found for this date.
                                </Typography>
                            )
                        ) : sourceOptions.length === 1 ? (
                            <Typography variant="body2">
                                {entityLabel} ID: #{sourceOptions[0].id} {sourceType === DAMAGE_SOURCE.ORDER ? `(${sourceOptions[0].orderType || ''})` : ''}
                            </Typography>
                        ) : (
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label={`Select ${entityLabel}`}
                                value={sourceId || ''}
                                onChange={(e) => {
                                    setValue("sourceId", e.target.value);
                                    setValue("productId", "");
                                }}
                            >
                                {sourceOptions.map((opt) => {
                                    const primaryText = sourceType === DAMAGE_SOURCE.ORDER
                                        ? `${opt.referenceNumber || 'Order'} (${opt.orderType})`
                                        : `${entityLabel} #${opt.id} - ${opt.status}`;

                                    return (
                                        <MenuItem key={opt.id} value={opt.id}>
                                            {primaryText}
                                        </MenuItem>
                                    );
                                })}
                            </TextField>
                        )}
                    </>
                )}

                {/* 5. Notes (Description) */}
                <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Notes / Description"
                            size="small"
                            placeholder="Describe the damage..."
                            fullWidth
                        />
                    )}
                />
            </Stack>
        </Box>
    );
}

export default DamageSourcePanel;
