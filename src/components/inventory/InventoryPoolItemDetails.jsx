import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { DATE_TIME, formatCustomDate } from "../../utils/dateUtils";
import StatusChip from "../common/StatusChip";
import DataTable from "../common/tables/DataTable";
import { inventoryService } from "../../services/inventoryService";

const toDateInputValue = (date) => date.toISOString().slice(0, 10);

function InventoryPoolItemDetails({ item, selectedPoolItemId, onClose }) {
  if (!item) return null;

  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState("");

  const defaultEndDate = useMemo(() => new Date(), []);
  const defaultStartDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 10);
    return date;
  }, []);

  const [startDate, setStartDate] = useState(
    toDateInputValue(defaultStartDate)
  );
  const [endDate, setEndDate] = useState(toDateInputValue(defaultEndDate));

  const poolItemStatusTransitionColumns = [
    { field: "fromStatus", headerName: "From Status", type: "shortText" },
    { field: "toStatus", headerName: "To Status", type: "shortText" },
    { field: "fromCondition", headerName: "From Condition", type: "shortText" },
    { field: "toCondition", headerName: "To Condition", type: "shortText" },
    {
      field: "transitionTime",
      headerName: "Date",
      type: "shortText",
      render: (value) => (value ? formatCustomDate(value, DATE_TIME) : "--"),
    },
    { field: "reason", headerName: "Reason", type: "text", isPrimary: false },
  ];

  const fetchTransactions = async () => {
    if (!item || !selectedPoolItemId) return;

    setLoadingTransactions(true);
    setTransactionsError("");

    const startDateTime = startDate ? `${startDate}T00:00:00` : null;
    const endDateTime = endDate ? `${endDate}T23:59:59` : null;

    try {
      const data = await inventoryService.getPoolItemTransactions(
        selectedPoolItemId,
        { startDate: startDateTime, endDate: endDateTime }
      );
      setTransactions(Array.isArray(data) ? data : data?.content || []);
    } catch (error) {
      console.error("Failed to fetch pool item transactions:", error);
      setTransactionsError("Failed to fetch pool item status transitions.");
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (!item || !selectedPoolItemId) return;
    setStartDate(toDateInputValue(defaultStartDate));
    setEndDate(toDateInputValue(defaultEndDate));
  }, [item?.id, selectedPoolItemId, defaultStartDate, defaultEndDate]);

  useEffect(() => {
    if (!item || !selectedPoolItemId) return;
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, selectedPoolItemId, startDate, endDate]);

  const activePoolItem = (item.linkedPoolItems || []).find(
    (pi) => pi.id === selectedPoolItemId
  );

  if (!activePoolItem) return null;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          px: 3,
          borderBottom: 1,
          borderColor: "#e0e0e0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Pool Item Details
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: "auto", px: 3, py: 2 }}>

      {/* Inventory Item Information */}
      <List disablePadding>
        <ListItem>
          <ListItemText
            primary={
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 500,
                  mb: 1,
                  color: "#2e7d32",
                }}
              >
                Inventory Item Information
              </Typography>
            }
            secondary={
              <>
                <Typography variant="body2">
                  <strong>Product:</strong>{" "}
                  {item.productName}
                </Typography>
                <Typography variant="body2">
                  <strong>Code:</strong>{" "}
                  {item.productCode}
                </Typography>
                <Typography variant="body2">
                  <strong>Warehouse:</strong>{" "}
                  {item.warehouseName}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> <StatusChip status={item.status} />
                </Typography>
              </>
            }
          />
        </ListItem>
      </List>

      <Divider sx={{ mb: 2 }} />

      {/* Active Pool Item Details */}
      <List disablePadding>
        <ListItem>
          <ListItemText
            primary={
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 500,
                  mb: 1,
                  color: "#2e7d32",
                }}
              >
                Pool Item Details
              </Typography>
            }
            secondary={
              <>
                <Typography variant="body2">
                  <strong>Pool Item ID:</strong>{" "}
                  {activePoolItem.id}
                </Typography>
                <Typography variant="body2">
                  <strong>Pool:</strong>{" "}
                  {activePoolItem.poolName}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong>{" "}
                  <StatusChip status={activePoolItem.status} />
                </Typography>
                <Typography variant="body2">
                  <strong>Condition:</strong>{" "}
                  {activePoolItem.condition}
                </Typography>
                {activePoolItem.addedToPoolAt && (
                  <Typography variant="body2">
                    <strong>Added to Pool:</strong>{" "}
                    {formatCustomDate(activePoolItem.addedToPoolAt, DATE_TIME)}
                  </Typography>
                )}
                {activePoolItem.removedFromPoolAt && (
                  <Typography variant="body2">
                    <strong>Removed from Pool:</strong>{" "}
                    {formatCustomDate(activePoolItem.removedFromPoolAt, DATE_TIME)}
                  </Typography>
                )}
              </>
            }
          />
        </ListItem>
      </List>

      <Divider sx={{ mb: 2 }} />

      {/* Pool Item Status Transitions Section */}
      <List disablePadding>
        <ListItem>
          <ListItemText
            primary={
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 500, color: "#2e7d32" }}
              >
                Pool Item Status Transitions
              </Typography>
            }
            secondary={
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </Box>

                {transactionsError && (
                  <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                    {transactionsError}
                  </Typography>
                )}

                {loadingTransactions ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <DataTable
                    columns={poolItemStatusTransitionColumns}
                    rows={transactions}
                    rowKey="id"
                    pagination={null}
                    onPageChange={null}
                    containerSx={{
                      my: 0,
                      boxShadow: "none",
                      border: "1px solid #e0e0e0",
                    }}
                  />
                )}
              </Box>
            }
          />
        </ListItem>
      </List>
      </Box>
    </Box>
  );
}

export default InventoryPoolItemDetails;
