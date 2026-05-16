// ------------------ InwardRequestsTable.jsx ------------------
import React from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper
} from "@mui/material";

function InwardRequestsTable({ inwardRequests, onSelect }) {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Vendor</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {inwardRequests.map((req) => (
            <TableRow
              key={req.id}
              hover
              onClick={() => onSelect(req)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell>{req.id}</TableCell>
              <TableCell>{req.vendorName}</TableCell>
              <TableCell>{new Date(req.inwardDate).toLocaleDateString()}</TableCell>
              <TableCell>{req.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default InwardRequestsTable;
