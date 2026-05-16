import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import CustomDrawer from "../common/CustomDrawer";
import DataTable from "../common/tables/DataTable";
import { inventoryService } from "../../services/inventoryService";
import { DATE_TIME, formatCustomDate } from "../../utils/dateUtils";
import CreateTransactionDialog from "./CreateTransactionDialog";
import AddIcon from "@mui/icons-material/Add";

function CustomerTransactionDrawer({ open, onClose, reservation, onRefresh }) {
  const reservationId = reservation?.id;
  const products = reservation?.items || [];
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 0,
    pageSize: 10,
  });

  // Create Transaction Dialog State
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const columns = [
    {
      field: "transactionDate",
      headerName: "Transaction Date",
      type: "shortText",
      render: (value) => formatCustomDate(value, DATE_TIME),
    },
    {
      field: "transactionCategory",
      headerName: "Category",
      type: "shortText",
      render: (value) => {
        let color = "inherit";
        if (value?.startsWith("PICKUP")) color = "warning.main";
        if (value?.startsWith("DELIVERY")) color = "primary.main";
        return (
          <Typography variant="body2" sx={{ color, fontWeight: 500 }}>
            {value}
          </Typography>
        );
      },
    },
    { field: "totalQuantity", headerName: "Quantity", type: "smallNumber" },
    {
      field: "transactionReferenceId",
      headerName: "Reference ID",
      type: "shortText",
    },
    {
      field: "transactionDetail",
      headerName: "Detail",
      type: "text",
      isPrimary: false,
    },
    {
      field: "quantityWithCustomer",
      headerName: "Qty(Customer)",
      type: "shortText",
      isPrimary: false,
    },
  ];

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: newPage,
    }));
  };

  const fetchTransactions = useCallback(
    async (pageNum, pageSize) => {
      setLoading(true);
      try {
        const formatDateTime = (date, isEnd = false) => {
            if (!date) return null;
            return isEnd ? `${date}T23:59:59` : `${date}T00:00:00`;
        };
        const data = await inventoryService.getReservationTransactions(
          reservationId,
          selectedProductId || null,
          pageNum,
          pageSize,
          formatDateTime(startDate),
          formatDateTime(endDate, true)
        );
        setTransactions(data.content || []);
        setPagination((prev) => ({
          ...prev,
          totalItems: data?.totalElements ?? prev.numberOfElements,
          pageSize: data?.size ?? prev.pageSize,
          currentPage: data?.number ?? page,
        }));
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    [reservationId, selectedProductId, startDate, endDate]
  );

  const handleCreateTransaction = async (payload, resetForm) => {
    setSaving(true);
    setError("");

    try {
      await inventoryService.createReservationTransaction(
        reservationId,
        payload
      );

      setOpenCreateDialog(false);
      resetForm();

      // Refresh table data
      fetchTransactions(pagination.currentPage, pagination.pageSize);

      onRefresh();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create transaction"
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open || !reservationId) return;
    fetchTransactions(pagination.currentPage, pagination.pageSize);
  }, [
    open,
    reservationId,
    pagination.currentPage,
    pagination.pageSize,
    fetchTransactions,
  ]);

  return (
    <CustomDrawer open={open} onClose={onClose} width={800}>
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
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Reservation Transactions
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.5 }}
            >
              <strong>{reservation.customerName}</strong>
              {/* — <em>{reservation.poolName}Pool</em> */}
            </Typography>
          </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              color="primary"
              onClick={() => setOpenCreateDialog(true)}
              sx={{ py: 1, px: 2 }}
            >
              Create Transaction
            </Button>
          </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Add here date filter. */}
        <Box sx={{ display: "flex", gap: 2, py: 1 }}>
             <TextField
              label="Start Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => {
                  setStartDate(e.target.value);
                  setPagination((prev) => ({ ...prev, currentPage: 0 }));
              }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => {
                  setEndDate(e.target.value);
                  setPagination((prev) => ({ ...prev, currentPage: 0 }));
              }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="product-select-label">Product</InputLabel>
              <Select
                labelId="product-select-label"
                id="product-select"
                value={selectedProductId}
                label="Product"
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  // Reset pagination to page 0 when filter changes
                  setPagination((prev) => ({ ...prev, currentPage: 0 }));
                }}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {products.map((product) => (
                  <MenuItem key={product.productId} value={product.productId}>
                    {product.productName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DataTable
            columns={columns}
            rows={transactions}
            size="small"
            rowKey="id"
            pagination={pagination}
            onPageChange={handlePageChange}
            expandable
          />
        )}

        <CreateTransactionDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          saving={saving}
          error={error}
          products={products}
          onSave={handleCreateTransaction}
        />
      </Box>
    </CustomDrawer>
  );
}

export default CustomerTransactionDrawer;
