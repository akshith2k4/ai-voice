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
} from "@mui/material";
import { formatCustomDate } from "../../../utils/dateUtils";

function WashFulfillmentTable({ data = [], onSelect }) {

  // const calculateTotalItems = (items) => {
  //   if (!Array.isArray(items) || items.length === 0) return 0;
  //   return items.reduce((sum, item) => {
  //     const qty = Number(item?.quantity);
  //     return sum + (Number.isFinite(qty) && qty > 0 ? qty : 1);
  //   }, 0);
  // };

  // const formatDateOnly = (value) => {
  //   if (!value) return "Not Set";
  //   const d = new Date(value);
  //   if (Number.isNaN(d.getTime())) return "Not Set";
  //   return format(d, "MMM dd, yyyy");
  // };

  const getIdentifier = (fulfillment) => {
    if (fulfillment.requestNumber) return fulfillment.requestNumber;
    if (fulfillment.washRequestIds?.length > 0) return fulfillment.washRequestIds.join(", ");
    return "—";
  };

  return (
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Request Number</TableCell>
            <TableCell>Pool Name</TableCell>
            <TableCell>Vendor Name</TableCell>
            <TableCell>Wash Fulfillment Date</TableCell>
            {/* <TableCell>Planned Time</TableCell> */}
            <TableCell>Status</TableCell>
            {/* <TableCell>Actual Time</TableCell> */}
            {/* <TableCell>Notes</TableCell> */}
            {/* <TableCell>Total Items</TableCell> */}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((f) => (
            <TableRow key={f.id} hover onClick={() => onSelect(f)} sx={{ cursor: "pointer", '& td': { py: 1 } }}>
              <TableCell>{f.id}</TableCell>
              <TableCell>{getIdentifier(f)}</TableCell>
              <TableCell>
                {Array.isArray(f.mappings) && f.mappings.length > 0
                  ? Array.from(new Set(
                      f.mappings
                        .map(m => m?.inventoryPoolName)
                        .filter(Boolean)
                    )).join(", ") || "—"
                  : "—"}
              </TableCell>
              <TableCell>{f.vendorName}</TableCell>
              <TableCell>
                {formatCustomDate(f.washFulfillmentDate || f.actualFulfillmentTime)}
              </TableCell>
              {/* <TableCell>
                {f.plannedFulfillmentTime
                  ? format(new Date(f.plannedFulfillmentTime), "dd/MM/yyyy HH:mm")
                  : "—"}
              </TableCell> */}
              <TableCell>
                <Chip
                  label={f.status}
                  size="small"
                  color={
                    f.status === "COMPLETED"
                      ? "success"
                      : f.status === "IN_PROGRESS"
                      ? "info"
                      : f.status === "PENDING"
                      ? "warning"
                      : f.status === "CANCELLED"
                      ? "error"
                      : "default"
                  }
                />
              </TableCell>
              {/* <TableCell>
                {f.actualFulfillmentTime
                  ? format(new Date(f.actualFulfillmentTime), "dd/MM/yyyy HH:mm")
                  : "Not Set"}
              </TableCell> */}
              {/* <TableCell>{f.notes || "—"}</TableCell> */}
              {/* <TableCell>{calculateTotalItems(f.items)}</TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default WashFulfillmentTable;
