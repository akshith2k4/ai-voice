import { TableCell, TableRow, Tooltip } from "@mui/material";
import React from "react";

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

export const DataRow = React.memo(function DataRow({
  row,
  columns,
  rowKey,
  onRowClick,
  rowSx,
  cellSx,
  onCellClick,
  selectedId,
}) {
  return (
    <TableRow
      hover
      key={row[rowKey]}
      sx={(theme) => ({
        cursor: onRowClick ? "pointer" : "default",
        backgroundColor:
          (row[rowKey] == selectedId && selectedId != null)
            ? `${theme.palette.customLightBlue.main} !important`
            : "transparent",
        ...(typeof rowSx === "function"
          ? typeof rowSx(row) === "function"
            ? rowSx(row)(theme)
            : rowSx(row)
          : rowSx),
      })}
      onClick={() => onRowClick?.(row)}
    >
      {columns.map((col) => (
        <TableCell
          key={`${row[rowKey]}-${col.field}`}
          align={col.align || "left"}
          sx={(theme) => ({
            width: `${col.width || widthMap[col.type] || 120}px !important`,
            maxWidth: `${col.width || widthMap[col.type] || 120}px !important`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            py: 1,
            ...(typeof col.cellSx === "function"
              ? col.cellSx(theme)
              : col.cellSx || {}),
            ...cellSx(row[col.field], row, col),
          })}
          onClick={(e) => {
            if (col.stopPropagation) e.stopPropagation();

            if (col.onClick) {
              e.stopPropagation();
              col.onClick(row[col.field], row);
            }

            if (onCellClick) {
              e.stopPropagation();
              onCellClick(row[col.field], row, col);
            }
          }}
        >
          <Tooltip
            title={
              col.tooltipVal
                ? col.tooltipVal(row[col.field], row)
                : ""
            }
          >
            {col.render
              ? col.render(row[col.field], row)
              : row[col.field] ?? "--"}
          </Tooltip>
        </TableCell>
      ))}
    </TableRow>
  );
},
areEqualRow);

function areEqualRow(prevProps, nextProps) {
  // Compare row object reference
  if (prevProps === nextProps) return true;

  // // Compare values shallowly for safety
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
}
