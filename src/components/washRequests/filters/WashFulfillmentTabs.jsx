import React, { useEffect, useRef } from "react";
import {
    Box,
    Button,
    Paper,
    TextField,
    MenuItem,
    Autocomplete,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { endOfDay, startOfDay } from "date-fns";

const INPUT_SX = {
    "& .MuiInputBase-root": { height: 40 },
    "& .MuiInputBase-input": { padding: "10px 12px", fontSize: "0.95rem" },
};

function WashFulfillmentTabs({
    filters,
    setFilters,
    poolOptions,
    onSearch,
    onCreateFulfillmentOpen,
}) {
    // Auto-trigger search when filters change (debounced), skip the first mount
    const firstRunRef = useRef(true);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (firstRunRef.current) {
            firstRunRef.current = false;
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (typeof onSearch === "function") onSearch();
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // Trigger when relevant filters change
    }, [filters?.startTime, filters?.endTime, filters?.status, filters?.poolName, onSearch]);
    return (
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, width: "100%" }}>
                {/* Left group: Start Date, End Date, Status */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: { xs: "wrap", md: "nowrap" } }}>
                    <Box sx={{ width: 180 }}>
                        <DatePicker
                            label="Start Date"
                            value={
                                filters?.startTime
                                    ? new Date(filters.startTime)
                                    : null
                            }
                            onChange={(date) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    startTime: date
                                        ? startOfDay(date).toISOString()
                                        : null,
                                }))
                            }
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: "small",
                                    sx: INPUT_SX,
                                },
                            }}
                        />
                    </Box>
                    <Box sx={{ width: 180 }}>
                        <DatePicker
                            label="End Date"
                            value={
                                filters?.endTime ? new Date(filters.endTime) : null
                            }
                            onChange={(date) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    endTime: date
                                        ? endOfDay(date).toISOString()
                                        : null,
                                }))
                            }
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: "small",
                                    sx: INPUT_SX,
                                },
                            }}
                        />
                    </Box>
                    <Box sx={{ width: 150 }}>
                        <TextField
                            select
                            label="Status"
                            fullWidth
                            size="small"
                            value={filters.status || ""}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    status: e.target.value,
                                })
                            }
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="PENDING">Pending</MenuItem>
                            <MenuItem value="ASSIGNED">Assigned</MenuItem>
                            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                            <MenuItem value="COMPLETED">Completed</MenuItem>
                            <MenuItem value="CANCELLED">Cancelled</MenuItem>
                            <MenuItem value="FAILED">Failed</MenuItem>
                        </TextField>
                    </Box>
                    <Autocomplete
                options={poolOptions || []}
                value={filters.poolName || null}

                freeSolo={false}

                onChange={(e, newValue) => {
                    setFilters((prev) => ({
                    ...prev,
                    poolName: newValue || "",
                    }));
                }}

                renderInput={(params) => (
                    <TextField {...params} label="Pool Name" size="small" />
                )}

                
                ListboxProps={{
                    style: {
                    maxHeight: 40 * 10, 
                    overflow: "auto",
                    },
                }}

                sx={{ width: 220 }}
                />
                    <Button
                        variant="contained"
                        onClick={() => onSearch?.()}
                        sx={{
                            height: 40,
                            minWidth: 96,
                            whiteSpace: "nowrap",
                            textTransform: "none",
                            background:
                                "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
                            boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
                        }}
                    >
                        Apply
                    </Button>
                </Box>

                {/* Right group: Create Fulfillment */}
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Button
                        variant="contained"
                        onClick={onCreateFulfillmentOpen}
                        sx={{ height: 40, minWidth: 200, whiteSpace: "nowrap" }}
                    >
                        + Create Fulfillment
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default WashFulfillmentTabs;
