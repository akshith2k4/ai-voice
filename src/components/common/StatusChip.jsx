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

    return (
        <Chip
            label={status}
            color={isError ? undefined : colorKey}
            size="small"
            sx={{
                ...(isError && {
                    backgroundColor: "#fd5c63",
                    color: "#fff",
                }),
                ...props.sx,
            }}
            {...props}
        />
    );
}
