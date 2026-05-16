import { Box, Typography, Divider, Chip } from "@mui/material";
import { useState, useEffect } from "react";
import DataTable from "../common/tables/DataTable";
import CustomDrawer from "../common/CustomDrawer";
import { inventoryService } from "../../services/inventoryService";
import { createColumn } from "../../utils/createColumn";

// ------------------------------
// Columns defined outside component
// ------------------------------
const renderStatusChip = (status) =>
  status === "EQUAL" ? null : (
    <Chip
      label={status}
      size="small"
      color={status === "LOW" ? "error" : "warning"}
      sx={{
        ml: 2,
        fontSize: "0.55rem",
        "& .MuiChip-label": {
          padding: "0px 8px",
        },
      }}
    />
  );

const getStatus = (row) => {
  if (row.currentQuantityWithCustomer > row.quantityAllocatedWithCustomer)
    return "HIGH";
  if (row.currentQuantityWithCustomer === row.quantityAllocatedWithCustomer)
    return "EQUAL";
  return "LOW";
};

const CUSTOMER_COLUMNS = [
  createColumn("customerName", "Customer Name", "shortText", {
    render: (value, row) => {
      const status = getStatus(row);
      return (
        <>
          <strong>{value}</strong>
          {renderStatusChip(status)}
        </>
      );
    },
  }),
  createColumn(
    "quantityAllocatedWithCustomer",
    "Allocated (Customer)",
    "number"
  ),
  createColumn("currentQuantityWithCustomer", "Curr. Qty (Customer)", "number"),
];

export default function CustomerInventoryDrawer({ product, isOpen, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch items when drawer is opened and product info is available
  useEffect(() => {
    if (!isOpen) return;
    if (!product.poolId || !product.productId) {
      setRows([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await inventoryService.getCustomerReservationItems(
          product.poolId,
          product.productId
        );
        setRows(data);
      } catch (error) {
        console.error("Failed to fetch customer reservation items", error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, product.poolId, product.productId]);

  return (
    <CustomDrawer open={isOpen} onClose={onClose} width={700}>
      <Box sx={{ p: 3, overflowY: "auto", pb: 6 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Customer Inventory Overview
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.5 }}
            >
              <strong>{product.productName}</strong> —{" "}
              <em>{product.poolName} Pool</em>
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <DataTable
          rowKey="customerId"
          columns={CUSTOMER_COLUMNS}
          rows={rows}
          loading={loading}
          emptyMessage="No customer inventory found"
          containerSx={{ borderRadius: 2, boxShadow: "none" }}
          rowSx={(row) => (theme) => ({
            backgroundColor:
              row.currentQuantityWithCustomer <
              row.quantityAllocatedWithCustomer
                ? `${theme.palette.error.lighter} !important`
                : "transparent",
          })}
        />
      </Box>
    </CustomDrawer>
  );
}
