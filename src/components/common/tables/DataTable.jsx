import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { DataRow } from "./DataRow";
import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import theme from "../../../theme";

const widthMap = {
  id: 60,
  smallNumber: 60,
  number: 80,
  shortText: 100,
  smallText: 120,
  mediumText: 140,
  text: 160,
  longText: 220,
};

export default function DataTable({
  columns = [],
  rows = [],
  onRowClick,
  onCellClick = null,
  rowKey = "id",
  size = "small",
  selectedId = null,
  pagination = null, // { totalItems, currentPage, pageSize }
  onPageChange = null, // callback(newPage)
  onRowsPerPageChange = null, // callback(newPageSize)
  containerSx = {}, // custom style for TableContainer
  rowSx = () => ({}), // function to style row: (row) => sxObject
  cellSx = () => ({}), // function to style cell: (value, row, col) => sxObject
  legendList = [],
  expandable = false,
}) {
  const [showFullColumns, setShowFullColumns] = useState(false);
  const visibleColumns = showFullColumns
    ? columns
    : columns.filter((col) => col.isPrimary !== false);
  const getColumnWidth = (col) => col.width || widthMap[col.type] || 120;
  return (
    <>
      <TableContainer component={Paper} sx={{ my: 2, ...containerSx }}>
        <Table size={size} sx={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            {visibleColumns.map((col) => (
              <col key={col.field} style={{ width: `${getColumnWidth(col)}px` }} />
            ))}
          </colgroup>
          <TableHead>
            <TableRow>
              {visibleColumns.map((col, index) => {
                const isLastColumn = index === visibleColumns.length - 1;
                return (
                  <TableCell
                    key={col.field}
                    align={col.align || "left"}
                    sx={{
                      position: 'relative',
                      fontWeight: 600,
                      width: `${getColumnWidth(col)}px`,
                      maxWidth: `${getColumnWidth(col)}px`,
                      ...(col.headerSx || {}),
                    }}
                  >
                    <Tooltip title={col.tooltip ?? col.headerName}>
                      {col.headerName}
                    </Tooltip>
                    {/* Toggle only in last column */}
                    {isLastColumn && expandable && (
                      <Tooltip
                        title={
                          showFullColumns
                            ? "Show fewer columns"
                            : "Show all columns"
                        }
                      >
                        <Box
                          onClick={() => setShowFullColumns((prev) => !prev)}
                          sx={{
                            position: 'absolute',
                            right: 10,
                            top:10,
                            cursor: "pointer",
                            display: "inline-flex",
                            height: 20,
                            backgroundColor: theme.palette.background.default,
                            borderRadius: 999,
                          }}
                        >
                          {showFullColumns ? (
                            <RemoveIcon fontSize="small" />
                          ) : (
                            <AddIcon fontSize="small" />
                          )}
                        </Box>
                      </Tooltip>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  align="center"
                  sx={{
                    py: 4,
                    color: theme.palette.customGray.main,
                    fontStyle: "italic",
                  }}
                >
                  No Data Available
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <DataRow
                  key={row[rowKey]}
                  row={row}
                  columns={visibleColumns}
                  rowKey={rowKey}
                  onRowClick={onRowClick}
                  rowSx={rowSx}
                  cellSx={cellSx}
                  onCellClick={onCellClick}
                  selectedId={selectedId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination && onPageChange && (
        <TablePagination
          component="div"
          count={pagination.totalItems}
          page={pagination.currentPage}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={(event) => {
            if (!onRowsPerPageChange) return;
            const newPageSize = Number(event.target.value);
            onRowsPerPageChange(newPageSize);
          }}
          rowsPerPageOptions={[pagination.pageSize, 25, 50, 100, 500, 1000, 1500, 2000]}
          sx={{ px: 2 }}
        />
      )}

      {legendList.length > 0 && (
        <Box sx={{ mt: 1.5, pl: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            Legend:
          </Typography>

          <List dense sx={{ mt: 0.5, color: "text.secondary", pl: 2 }}>
            {legendList.map((col, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      <strong>{col.abbr}</strong> = {col.name}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </>
  );
}
