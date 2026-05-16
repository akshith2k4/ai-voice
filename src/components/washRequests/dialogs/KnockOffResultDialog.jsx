import React, { useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from "@mui/material";

const normalizeDateKey = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
        return value.slice(0, 10);
    }
    const dt = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const formatDateLabel = (dateKey) => {
    if (!dateKey) return "";
    const dt = new Date(dateKey);
    if (Number.isNaN(dt.getTime())) return dateKey;
    return dt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
};

export default function KnockOffResultDialog({
    open,
    onClose,
    onBack,
    onConfirm,
    confirmLoading = false,
    data,
}) {
    if (!data) return null;

    const { dateColumns, rows } = useMemo(() => {
        const dateSet = new Set();
        (data.washRequestDetails || []).forEach((wr) => {
            const key = normalizeDateKey(wr.washRequestDate);
            if (key) dateSet.add(key);
        });

        if (dateSet.size === 0) {
            (data.processedProducts || []).forEach((product) => {
                (product.knockedOffFromWashRequests || []).forEach((wr) => {
                    const key = normalizeDateKey(wr.washRequestDate);
                    if (key) dateSet.add(key);
                });
            });
        }

        const dateColumnsList = Array.from(dateSet).sort();

        const rowsList = (data.processedProducts || []).map((product) => {
            const dateMap = {};
            dateColumnsList.forEach((dateKey) => {
                dateMap[dateKey] = 0;
            });

            (product.knockedOffFromWashRequests || []).forEach((wr) => {
                const dateKey = normalizeDateKey(wr.washRequestDate);
                if (!dateKey) return;
                if (dateMap[dateKey] == null) {
                    dateMap[dateKey] = 0;
                }
                dateMap[dateKey] +=
                    Number(wr.freshQuantityKnockedOff || 0) +
                    Number(wr.soiledQuantityKnockedOff || 0) +
                    Number(wr.damagedQuantityKnockedOff || 0);
            });

            return {
                productId: product.productId,
                productName: product.productName,
                quantityReturned: product.quantityReturned || 0,
                totalQuantityMatched: product.totalQuantityMatched || 0,
                totalQuantityUnmatched: product.totalQuantityUnmatched || 0,
                dateMap,
            };
        });

        return { dateColumns: dateColumnsList, rows: rowsList };
    }, [data]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle sx={{ pb: 1 }}>Review Wash Fulfillment</DialogTitle>
            <DialogContent dividers sx={{ minHeight: 600, maxHeight: 660 }}>
                <Box sx={{ mb: 3, display: "flex", gap: 3, backgroundColor: "action.hover", p: 2, borderRadius: 2 }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Total Requests Matched</Typography>
                        <Typography variant="h6">{data.totalRequestsMatched || 0}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Total Items Knocked Off</Typography>
                        <Typography variant="h6" color="success.main">{data.totalItemsKnockedOff || 0}</Typography>
                    </Box>
                </Box>

                <TableContainer component={Paper} variant="outlined">
                    <Table aria-label="knock-off review table" size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "action.hover" }}>
                                <TableCell>Product</TableCell>
                                <TableCell align="right">Returned</TableCell>
                                {dateColumns.map((dateKey) => (
                                    <TableCell key={dateKey} align="center">
                                        {formatDateLabel(dateKey)}
                                    </TableCell>
                                ))}
                                <TableCell align="right">Unmatched</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.productId}>
                                    <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                                        {row.productName}
                                    </TableCell>
                                    <TableCell align="right">{row.quantityReturned}</TableCell>
                                    {dateColumns.map((dateKey) => {
                                        const knockedOff = row.dateMap[dateKey] || 0;
                                        return (
                                            <TableCell key={`${row.productId}-${dateKey}`} align="center">
                                                {knockedOff > 0 ? knockedOff : "-"}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell
                                        align="right"
                                        sx={{
                                            color: row.totalQuantityUnmatched > 0 ? "error.main" : "text.primary",
                                            fontWeight: row.totalQuantityUnmatched > 0 ? 600 : 400,
                                        }}
                                    >
                                        {row.totalQuantityUnmatched}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={Math.max(4, dateColumns.length + 3)} align="center" sx={{ py: 3 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No products matched.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions>
                <Button onClick={onBack || onClose} variant="outlined" color="secondary">
                    Back
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="primary"
                    disabled={confirmLoading}
                >
                    {confirmLoading ? "Saving..." : "Confirm & Submit"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
