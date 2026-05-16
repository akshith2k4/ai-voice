// ------------------ InventorySummaryTable.jsx ------------------
import React from "react";
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";

function InventorySummaryTable({ inventorySummary }) {
  return (
    <TableContainer component={Paper} sx={{ mb: 4 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Total Qty</TableCell>
            <TableCell>Available</TableCell>
            <TableCell>Reserved</TableCell>
            <TableCell>Soiled</TableCell>
            <TableCell>Damaged</TableCell>
            <TableCell>Warehouse</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {inventorySummary.map((item) => {
            const reserved =
              item.totalQuantity -
              item.availableQuantity -
              item.soiledQuantity -
              item.damagedQuantity;

            return (
              <TableRow key={item.productId}>
                <TableCell><strong>{item.productName}</strong></TableCell>
                <TableCell>{item.totalQuantity}</TableCell>
                <TableCell>{item.availableQuantity}</TableCell>
                <TableCell>{reserved}</TableCell>
                <TableCell>{item.soiledQuantity}</TableCell>
                <TableCell>{item.damagedQuantity}</TableCell>
                <TableCell>{item.warehouse.warehouseName}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default InventorySummaryTable;
