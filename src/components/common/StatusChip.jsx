import React from "react";
import { Chip } from "@mui/material";
import { getStatusChipColor } from "../../utils/statusUtils";

/**
 * A global Status Chip component that automatically determines color based on status text.
 * @param {string} status - The status text to display.
 * @param {object} props - Additional props for the MUI Chip (size, variant, etc.).
 */
export default function StatusChip({ status, ...props }) {
    if (!status) return null;

    const colorKey = getStatusChipColor(status);
    const isError = colorKey === "error";
    const isPartiallyPacked = String(status).toUpperCase() === "PARTIALLY_PACKED";

    return (
        <Chip
            label={status}
            color={isError || isPartiallyPacked ? undefined : colorKey}
            size="small"
            sx={{
                ...(isError && {
                    backgroundColor: "#fd5c63",
                    color: "#fff",
                }),
                ...(isPartiallyPacked && {
                    backgroundColor: "rgba(156, 39, 176, 0.08)",
                    color: "#9c27b0",
                    border: "1px solid rgba(156, 39, 176, 0.18)",
                }),
                ...props.sx,
            }}
            {...props}
        />
    );
}
