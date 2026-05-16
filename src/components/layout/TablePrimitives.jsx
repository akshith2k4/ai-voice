import React from "react";
import { TableContainer, Paper, Table, TableCell, TableRow } from "@mui/material";

// Consistent container with Paper and elevation
export const DenseTableContainer = ({ children, elevation = 3, sx, ...props }) => (
  <TableContainer component={Paper} elevation={elevation} sx={{ ...sx }} {...props}>
    {children}
  </TableContainer>
);

// Consistent compact table
export const DenseTable = ({ children, ...props }) => (
  <Table size="small" {...props}>
    {children}
  </Table>
);

// Header cell with unified styling
export const HeaderCell = ({ sx, ...props }) => (
  <TableCell sx={{ py: 1.5, backgroundColor: "primary.lighter", fontWeight: 500, ...sx }} {...props} />
);

// Striped row with compact cell padding
export const StripedRow = ({ sx, ...props }) => (
  <TableRow
    sx={{
      cursor: "pointer",
      "&:nth-of-type(odd)": { backgroundColor: "background.default" },
      "& td": { py: 1 },
      ...sx,
    }}
    {...props}
  />
);
