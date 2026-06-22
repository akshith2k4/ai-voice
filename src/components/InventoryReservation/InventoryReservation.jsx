import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Button,
  Box,
  Typography,
  Drawer,
  TextField,
  Stack,
  Grid,
  MenuItem,
  Divider,
  Alert,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { inventoryService } from "../../services/inventoryService";
import CreateReservationDialog from "./CreateReservationDialog";
import CustomSnackbar from "../layout/CustomSnackbar";
import { reservationTransformers } from "../../utils/reservationTransformers";
import { transformPools } from "../../utils/poolTransformers";
import CustomerTransactionDrawer from "./CustomerTransactionDrawer";
import DataTable from "../common/tables/DataTable";

const ReservationStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};
const RESERVATION_STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

function InventoryReservation() {
  // Removed unused local states to satisfy linter
  const [customerReservation, setCustomerReservation] = useState([]);
  const [openReservationDialog, setOpenReservationDialog] = useState(false);
  const [CustomSnackbarOpen, setCustomSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedReservation, setSelectedReservation] = useState({ id: "" });
  const [pools, setPools] = useState([]);
  const [poolsWithProducts, setPoolsWithProducts] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState({ id: "all", productItems: [] });
  const [openReservationDetailsDrawer, setOpenReservationDetailsDrawer] =
    useState(false);
  const [openTransactionDrawer, setOpenTransactionDrawer] = useState(false);
  const [reservationStatus, setReservationStatus] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");

  const reservationColumns = [
    { field: "id", headerName: "ID", type: "id" },
    {
      field: "customerName",
      headerName: "Customer",
      type: "shortText",
      render: (value, row) => {
        const isActive = row.status === ReservationStatus.ACTIVE;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title={isActive ? "Active" : "Inactive"} arrow>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: isActive ? "success.main" : "error.main",
                  flexShrink: 0,
                }}
              />
            </Tooltip>
            <strong>{value}</strong>
          </Box>
        );
      },
    },
    // { field: "par", headerName: "Par", type: "smallNumber" },
    {
      field: "products",
      headerName: "Products",
      type: "smallNumber",
      cellSx: (theme) => ({
        color: theme.palette.primary.dark,
        cursor: "pointer",
        fontWeight: 500,
        "&:hover": {
          textDecoration: "underline",
        },
      }),
      onClick: (_, row) => {
        setSelectedReservation(row);
        setOpenReservationDetailsDrawer(true);
      },
    },
    {
      field: "totalAllocatted",
      headerName: "Allocated Total",
      type: "smallNumber",
    },
    // {
    //   field: "allocatedWarehouse",
    //   headerName: "Allocated (DC)",
    //   type: "smallNumber",
    // },
    {
      field: "allocatedCustomer",
      headerName: "Allocated (Customer)",
      type: "smallNumber",
    },
    // {
    //   field: "currentWithWarehouse",
    //   headerName: "Current (DC)",
    //   type: "smallNumber",
    // },
    {
      field: "currentWithCustomer",
      headerName: "Current (Customer)",
      type: "smallNumber",
    },
    {
      field: "actions",
      headerName: "Actions",
      type: "actions",
      sortable: false,
      render: (value, row) => (
        <Button
          variant="outlined"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setEditReservationData(row);
            setOpenReservationDialog(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const reservedProductColumns = [
    {
      field: "productName",
      headerName: "Product",
      type: "shortText",
      render: (value, row) => {
        const isActive = row?.isActive;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title={isActive ? "Active" : "Inactive"} arrow>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: isActive ? "success.main" : "error.main",
                  flexShrink: 0,
                }}
              />
            </Tooltip>
            {value}
          </Box>
        );
      },
    },
    {
      field: "totalReservedQuantity",
      headerName: "Total Allocated",
      type: "smallNumber",
    },
    {
      field: "quantityAllocatedWithDC",
      headerName: "Allocated (DC)",
      tooltip: "Allocated Delivery Centre (Warehouse)",
      type: "smallNumber",
    },
    {
      field: "quantityAllocatedWithCustomer",
      headerName: "Allocated (Cust.)",
      tooltip: "Allocated With Customer",
      type: "smallNumber",
    },
    {
      field: "currentQuantityWithDC",
      headerName: "Curr. Qty (DC)",
      tooltip: "Current Quatity With Delivery Centre (Warehouse)",
      type: "smallNumber",
    },
    {
      field: "currentQuantityWithCustomer",
      headerName: "Curr. Qty (Cust.)",
      tooltip: "Current Quatity With Customer",
      type: "smallNumber",
    },
  ];

  const headerAbbreviations = [
    { abbr: "DC", name: "Delivery Centre (Warehouse)" },
    { abbr: "Cust.", name: "Customer" },
    { abbr: "Curr.", name: "Current" },
  ];

  // Fetch branchId from local storage
  const branchId = localStorage.getItem("branchId") || "default-branch-id"; // Replace 'default-branch-id' with a fallback if needed

  // Removed fetchers for unused data (stock/vendors/products)
  const fetchReservations = useCallback(async () => {
    try {
      const data = await inventoryService.getReservationsByBranchAndPoolId(
        branchId,
        pool.id == "all" ? null : pool.id,
      );
      setCustomerReservation(reservationTransformers(data));
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    }
  }, [branchId, pool.id]);

  const handleRowClick = (reservation) => {
    setSelectedReservation(reservation);
    // setSelectedReservationId(reservation.id);
    setOpenTransactionDrawer(true);
  };

  const handlePoolChange = (e) => {
    const newPoolId = e.target.value;
    setPool(
      poolsWithProducts.find((pool) => pool.id === newPoolId) || {
        id: "all",
        productItems: [],
      },
    );
  };

  useEffect(() => {
    if (pool.id) fetchReservations();
  }, [branchId, pool.id, fetchReservations]);

  // Fetching Pools
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await inventoryService.getPools();

        // Use transformer to normalize pool-level info
        setPools(transformPools(data));
        setPoolsWithProducts(data);
      } catch (e) {
        console.error(e);
        setErrorMessage("Failed to load inventory pools.");
        setCustomSnackbarOpen(true);
        setError((prev) => prev || "Failed to load inventory pools.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [editReservationData, setEditReservationData] = useState(null);

  const handleCreateReservation = () => {
    setEditReservationData(null);
    setOpenReservationDialog(true);
  };
  const handleStatusChange = (e) => {
  const status = e.target.value;
  setReservationStatus(status);
};
const filteredReservations = customerReservation.filter((r) => {
  const matchesStatus = reservationStatus === "all" || r.status === reservationStatus;
  const matchesCustomer = !customerSearch || r.customerName?.toLowerCase().includes(customerSearch.toLowerCase());
  return matchesStatus && matchesCustomer;
});

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Stack spacing={1} sx={{ mb: 1 }}>
        {!!error && <Alert severity="error">{error}</Alert>}
      </Stack>

      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box
          display={"flex"}
          gap={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          {/* DropDown for selection of inventory pool */}
          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              size="small"
              label="Search Customer"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              sx={{ width: "14rem" }}
              placeholder="Search by name..."
            />
            {loading ? (
              "Loading..."
            ) : (
              <TextField
                select
                size="small"
                label="Inventory Pool"
                value={pool.id}
                onChange={handlePoolChange}
                sx={{ width: "14rem" }}
              >
                <MenuItem value="all">All</MenuItem>
                {pools &&
                  pools.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}
            <TextField
              select
              size="small"
              label="Reservation Status"
              value={reservationStatus}
              onChange={handleStatusChange}
              sx={{ width: "12rem" }}
            >
              {RESERVATION_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateReservation}
              sx={{
                px: 2,
                background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
                boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
                whiteSpace: "nowrap",
              }}
              data-agent-action="create-reservation"
            >
              Create Reservation
            </Button>
          </Box>
        </Box>
      </Paper>

      <DataTable
        columns={reservationColumns}
        rows={filteredReservations}
        onRowClick={handleRowClick}
        rowKey="id"
        size="small"
        selectedId={selectedReservation.id}
      />

      <CustomSnackbar
        open={CustomSnackbarOpen}
        message={errorMessage}
        onClose={() => setCustomSnackbarOpen(false)}
      />

      <CreateReservationDialog
        open={openReservationDialog}
        onClose={() => setOpenReservationDialog(false)}
        onSave={fetchReservations}
        pools={pools}
        poolsWithProducts={poolsWithProducts}
        initialData={editReservationData}
      />

      {/* <Activity mode={openTransactionDrawer ? "visible" : "hidden"}> */}
      {openTransactionDrawer && (
        <CustomerTransactionDrawer
          open={openTransactionDrawer}
          onClose={() => setOpenTransactionDrawer(false)}
          reservation={selectedReservation}
          onRefresh={fetchReservations}
        />
      )}
      {/* </Activity> */}

      <Drawer
        anchor="right"
        open={openReservationDetailsDrawer}
        onClose={() => setOpenReservationDetailsDrawer(false)}
        PaperProps={{
          elevation: 1,
          sx: {
            width: 700,
            backgroundColor: "#ffffff !important",
            boxShadow: "-4px 0 8px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        {selectedReservation && (
          <Box sx={{ p: 2, backgroundColor: "#ffffff" }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: "#000000", fontWeight: "bold" }}
            >
              Reservation Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {[
              { label: "Customer", value: selectedReservation.customerName },
              {
                label: "Status",
                value: selectedReservation.status || "N/A",
                render: (val) => (
                  <Box
                    component="span"
                    sx={{
                      color: val === ReservationStatus.ACTIVE ? "success.main" : "error.main",
                      fontWeight: "bold",
                    }}
                  >
                    {val}
                  </Box>
                ),
              },
              {
                label: "Reservation Type",
                value: selectedReservation.reservationType,
              },
              { label: "Notes", value: selectedReservation.notes },
            ].map((detail, idx) => (
              <Typography
                key={idx}
                variant="body2"
                sx={{ color: "#000000", fontWeight: "bold" }}
              >
                {detail.label}:{" "}
                {detail.render ? (
                  detail.render(detail.value)
                ) : (
                  <span style={{ fontWeight: "normal" }}>{detail.value}</span>
                )}
              </Typography>
            ))}

            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: "bold", color: "#000000" }}
              >
                Products Reserved
              </Typography>
            </Box>

            {/* Products Reserved Table (switched to DataTable) */}
            {selectedReservation.items && (
              <DataTable
                columns={reservedProductColumns}
                rows={selectedReservation.items}
                size="small"
                rowKey="productId"
                legendList={headerAbbreviations}
              />
            )}

            {/* <Box sx={{ display: "flex", gap: 1, mt: 3 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                sx={{
                                    textTransform: "none",
                                    background:
                                        "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
                                    boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
                                }}
                                onClick={() => {
                                    navigate("/inventory-item-reservation", {
                                        state: {
                                            reservation: selectedReservation,
                                            customer: {
                                                name: selectedReservation.customerName,
                                                rating: selectedReservation.customerRating, // only if available
                                                relationshipStatus:
                                                    selectedReservation.relationshipStatus, // only if available
                                            },
                                            products: selectedReservation.items,
                                        },
                                    });
                                }}
                            >
                                Reserve Items
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                sx={{ textTransform: "none" }}
                                onClick={async () => {
                                    if (!selectedReservation) return;
                                    if (
                                        window.confirm(
                                            `Delete all reservations for ${selectedReservation.customerName}?`
                                        )
                                    ) {
                                        try {
                                            await inventoryService.deleteReservationsByCustomer(
                                                selectedReservation.customerId
                                            );
                                            setSelectedReservation(null);
                                            fetchReservations();
                                        } catch (err) {
                                            console.error(
                                                "Failed to delete reservations by customer",
                                                err
                                            );
                                            const backendMessage =
                                                err.response?.data?.message ||
                                                "Failed to delete reservations. Please try again.";
                                            setErrorMessage(backendMessage);
                                            setCustomSnackbarOpen(true);
                                        }
                                    }
                                }}
                            >
                                Delete Reservations
                            </Button>
                        </Box> */}
          </Box>
        )}
      </Drawer>
    </Container>
  );
}

export default InventoryReservation;
