import { Box, Button, Divider, Typography } from "@mui/material";
import DataTable from "../common/tables/DataTable";
import AddTransactionDialog from "./AddTransactionDialog";
import InwardInventoryItemsToPoolDialog from "./InwardInventoryItemsToPoolDialog";
import { useState, useEffect } from "react";
import { inventoryService } from "../../services/inventoryService";
import { formatCustomDate, DATE_TIME } from "../../utils/dateUtils";
import CustomDrawer from "../common/CustomDrawer";
import AddIcon from "@mui/icons-material/Add";

// Table columns (using your DataTable)
const transactionsColumns = [
  {
    field: "transactionType",
    headerName: "Type",
    type: "number",
    render: (value) => {
      return <strong>{value}</strong>;
    },
  },
  { field: "transactionQuantity", headerName: "Qty", type: "smallNumber" },
  {
    field: "transactionReferenceId",
    headerName: "Refer. ID",
    tooltip: "Reference ID",
    type: "number",
  },
  {
    field: "transactionTime",
    headerName: "Date",
    type: "shortText",
    render: (value) => (value ? formatCustomDate(value, DATE_TIME) : "--"),
  },
];

export default function InventoryPoolTransactionDrawer({
  product,
  open,
  onClose,
  onRefresh,
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [openInwardDialog, setOpenInwardDialog] = useState(false);
  const [pagination, setPagination] = useState({
    totalItems: 0, // total items from API
    currentPage: 0, // 0-based page index
    pageSize: 10, // 10 rows per page
  });
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: newPage,
    }));
  };

  const fetchTransactions = async (page = 0, size = pagination.pageSize) => {
    if (!product?.poolId) return;
    setLoading(true);
    try {
      const data = await inventoryService.getPoolTransactions(
        product.poolId,
        product.productId,
        page,
        size
      );
      setRows(data.content || []);

      setPagination((prev) => ({
        ...prev,
        totalItems: data?.totalElements ?? prev.numberOfElements,
        pageSize: data?.size ?? prev.pageSize,
        currentPage: data?.number ?? page,
      }));
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    // after saving a transaction elsewhere, refresh current page
    try {
      await fetchTransactions(pagination.currentPage, pagination.pageSize);
      onRefresh();
    } catch {
      // ignore
    }
  };

  const handleAddTransaction = () => {
    setOpenDialog(true);
  };

  const handleAddInwardItems = () => {
    setOpenInwardDialog(true);
  };

  // Fetch initial and subsequent pages
  useEffect(() => {
    if (!product?.poolId) return; // Don't fetch if poolId is null/undefined

    fetchTransactions(pagination.currentPage, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.currentPage,
    pagination.pageSize,
    product.poolId,
    product.productId,
  ]);

  return (
    <CustomDrawer open={open} onClose={onClose} width={800}>
      <Box sx={{ p: 3, overflowY: "auto", pb: 6 }}>
        {/* Transactions Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Pool Events List
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.5 }}
            >
              <strong>{product.productName}</strong> —{" "}
              <em>{product.poolName} Pool</em>
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            color="primary"
            onClick={handleAddTransaction}
            sx={{ py: 1, px: 2 }}
          >
            Add Pool Events
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            color="primary"
            onClick={handleAddInwardItems}
            sx={{ py: 1, px: 2 }}
          >
            Add Inward Items
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Add Transaction Dialog */}
        <AddTransactionDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          product={product}
          onSave={handleRefresh}
        />

        {/* Add Inward Items Dialog */}
        <InwardInventoryItemsToPoolDialog
          open={openInwardDialog}
          onClose={() => setOpenInwardDialog(false)}
          onSave={handleRefresh}
          product={product}
        />

        {/* Transactions Table */}
        <DataTable
          columns={transactionsColumns}
          rows={rows || []}
          containerSx={{ borderRadius: 2 }}
          pagination={pagination}
          onPageChange={handlePageChange}
          loading={loading}
        />
      </Box>
    </CustomDrawer>
  );
}
