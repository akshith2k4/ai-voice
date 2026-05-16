// ------------------ InwardRequestDrawer.jsx ------------------
import React from "react";
import {
  Drawer,
  Box,
  Typography,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";

function InwardRequestDrawer({ inwardRequest, onClose }) {
  return (
    <Drawer
      anchor="right"
      open={Boolean(inwardRequest)}
      onClose={onClose}
      PaperProps={{ sx: { width: 500 } }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">
          Inward Request #{inwardRequest?.id}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2">
          Vendor: {inwardRequest?.vendorName}
        </Typography>
        <Typography variant="body2">
          Date: {new Date(inwardRequest?.inwardDate).toLocaleString()}
        </Typography>
        <Typography variant="body2">
          Status: {inwardRequest?.status}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">Items</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inwardRequest?.items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.productName}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.remarks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Drawer>
  );
}

export default InwardRequestDrawer;
