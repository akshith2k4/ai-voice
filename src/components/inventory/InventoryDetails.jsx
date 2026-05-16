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

function InventoryDetails({ item, onClose }) {
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

  const inventoryItemTransactionColumns = [
    { field: "inventoryItemId", headerName: "Inventory Item ID", type: "number" },
    { field: "fromLocationType", headerName: "From Location Type", type: "shortText" },
    {
      field: "fromLocationReferenceId",
      headerName: "From Location Ref ID",
      type: "shortText",
    },
    { field: "toLocationType", headerName: "To Location Type", type: "shortText" },
    {
      field: "toLocationReferenceId",
      headerName: "To Location Ref ID",
      type: "shortText",
    },
    {
      field: "transactionType",
      headerName: "Type",
      type: "shortText",
      render: (value) => <strong>{value ?? "--"}</strong>,
    },
    {
      field: "transactionTime",
      headerName: "Date",
      type: "shortText",
      render: (value) => (value ? formatCustomDate(value, DATE_TIME) : "--"),
    },
    { field: "remarks", headerName: "Remarks", type: "text", isPrimary: false },
  ];

  const fetchTransactions = async () => {
    if (!item) return;

    setLoadingTransactions(true);
    setTransactionsError("");

    const startDateTime = startDate ? `${startDate}T00:00:00` : null;
    const endDateTime = endDate ? `${endDate}T23:59:59` : null;

    try {
      const data = await inventoryService.getInventoryItemTransactions(
        item.id,
        { startDate: startDateTime, endDate: endDateTime }
      );
      setTransactions(Array.isArray(data) ? data : data?.content || []);
    } catch (error) {
      console.error("Failed to fetch inventory item transactions:", error);
      setTransactionsError("Failed to fetch inventory item transactions.");
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (!item) return;
    setStartDate(toDateInputValue(defaultStartDate));
    setEndDate(toDateInputValue(defaultEndDate));
  }, [item?.id, defaultStartDate, defaultEndDate]);

  useEffect(() => {
    if (!item) return;
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, startDate, endDate]);

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
          Inventory Item Details
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: "auto", px: 3, py: 2 }}>

      {/* Item Information */}
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
                Item Information
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
                <Typography variant="body2">
                  <strong>Manufactured:</strong>{" "}
                  {formatCustomDate(item.manufacturedDate)}
                </Typography>
              </>
            }
          />
        </ListItem>
      </List>

      <Divider sx={{ mb: 2 }} />

      {/* Transactions Section */}
      <List disablePadding>
        <ListItem>
          <ListItemText
            primary={
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 500, color: "#2e7d32" }}
              >
                Inventory Item Transactions
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
                    columns={inventoryItemTransactionColumns}
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

export default InventoryDetails;
