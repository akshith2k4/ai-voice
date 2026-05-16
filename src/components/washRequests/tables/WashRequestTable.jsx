import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Tooltip
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { washRequestService } from "../../../services/washRequestService";
import { formatCustomDate } from "../../../utils/dateUtils";

// Helper to format ISO date strings to "Aug 6 2025"
// const formatDate = (isoString) => {
//     if (!isoString) return "—";
//     const datePart = isoString.split("T")[0];
//     if (!datePart) return "—";
//     const [year, month, day] = datePart.split("-");
//     if (!year || !month || !day) return "—";
//     const months = [
//         "Jan",
//         "Feb",
//         "Mar",
//         "Apr",
//         "May",
//         "Jun",
//         "Jul",
//         "Aug",
//         "Sep",
//         "Oct",
//         "Nov",
//         "Dec",
//     ];
//     const mIndex = parseInt(month, 10) - 1;
//     const dNum = parseInt(day, 10);
//     if (isNaN(mIndex) || isNaN(dNum) || mIndex < 0 || mIndex > 11) return "—";
//     return `${months[mIndex]} ${dNum} ${year}`;
// };

function WashRequestTable({ data, onSelect, onDeleted }) {
    const handleDelete = async (e, req) => {
        e.stopPropagation();
        const confirm = window.confirm(
            `Delete Wash Request #${req.id}? This action cannot be undone.`
        );
        if (!confirm) return;
        try {
            await washRequestService.deleteById(req.id);
            if (onDeleted) onDeleted(req);
        } catch (err) {
            console.error("Failed to delete wash request", err);
            alert("Failed to delete wash request. Please try again.");
        }
    };
    return (
        <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Pool Name</TableCell>
                        <TableCell>Pool Type</TableCell>
                        <TableCell>Wash Type</TableCell>
                        <TableCell>Vendor</TableCell>
                        {/* <TableCell>Created Date</TableCell> */}
                        <TableCell>Wash Request Date</TableCell>
                        {/* <TableCell>Actual</TableCell> */}
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((req) => (
                        <TableRow
                            key={req.id}
                            hover
                            onClick={() => onSelect(req)}
                            sx={{ cursor: "pointer", '& td': { py: 1 } }}
                        >
                            <TableCell>{req.id}</TableCell>
                            {/* <TableCell>{req.referenceId}</TableCell> */}
                            <TableCell>{req.referenceName}</TableCell>
                            <TableCell>{req.referenceType}</TableCell>
                            <TableCell>{req.washRequestType}</TableCell>
                            <TableCell>
                                {req.laundryVendorName || "N/A"}
                            </TableCell>
                            {/* <TableCell>
                                {formatDate(req.createdDate)}
                            </TableCell> */}
                             <TableCell>
                                {formatCustomDate(req.washRequestRecordedDate)}
                            </TableCell>
                            {/* <TableCell>
                                {req.actualWashTime?.split("T")[0] || "Not Set"}
                            </TableCell> */}
                            {/* <TableCell>{req.status}</TableCell> */}
                            <TableCell>
                                <Chip
                                    label={req.status}
                                    size="small"
                                    color={
                                        req.status === "COMPLETED"
                                            ? "success"
                                            : req.status === "IN_PROGRESS"
                                            ? "info"
                                            : req.status === "PENDING"
                                            ? "warning"
                                            : req.status === "CANCELLED"
                                            ? "error"
                                            : "default"
                                    }
                                />
                            </TableCell>
                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="Delete">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={(e) => handleDelete(e, req)}
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export default WashRequestTable;
