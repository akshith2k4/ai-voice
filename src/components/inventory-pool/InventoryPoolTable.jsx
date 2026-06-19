import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { useEffect, useState } from "react";
import DataTable from "../common/tables/DataTable";
import { inventoryService } from "../../services/inventoryService";
import CustomerInventoryDrawer from "./CustomerInventoryDrawer";
import InventoryPoolTransactionDrawer from "./InventoryPoolTransactionDrawer";
import { transformPoolsWithProducts } from "../../utils/poolTransformers";
import AddIcon from "@mui/icons-material/Add";
import CreatePoolDialog from "./CreatePoolDialog";

const EmptyProduct = {
  poolId: "",
  productId: "",
  productName: "",
  poolName: "",
};

function InventoryPoolTable() {
  const [isCustomerInventoryOpen, setIsCustomerInventoryOpen] = useState(false);

  const [openTransactions, setOpenTransactions] = useState(false); // Customer Inventory
  const [selectedProduct, setSelectedProduct] = useState(EmptyProduct); // Track selected product
  const [poolId, setPoolId] = useState("all");
  const [poolProducts, setPoolProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [pools, setPools] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openCreatePoolDialog, setOpenCreatePoolDialog] = useState(false);
  const [productStatus, setProductStatus] = useState("all");


const PRODUCT_STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

  const poolColumns = [
    { field: "id", headerName: "ID", type: "id" },
    {
      field: "name",
      headerName: "Pool Name",
      type: "shortText",
      render: (value) => {
        return <strong>{value}</strong>;
      },
    },
    {
      field: "productName",
      headerName: "Product",
      type: "shortText",
      render: (value, row) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={row.isActive ? "Active" : "Inactive"} arrow>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: row.isActive ? "success.main" : "error.main",
              }}
            />
          </Tooltip>
          {value}
        </Box>
      ),
    },
    {
      field: "totalAllocatedQuantity",
      headerName: "Allocated Qty",
      type: "smallNumber",
    },
    {
      field: "freshAvailableQuantity",
      headerName: "Fresh Available",
      type: "smallNumber",
    },
    { field: "soiledQuantity", headerName: "Qty Soiled", type: "smallNumber" },
    { field: "heavySoiledQuantity", headerName: "Qty H. Soiled", type: "smallNumber" },
    { field: "damagedQuantity", headerName: "Damaged", type: "smallNumber" },
    {
      field: "quantityWithCustomers",
      headerName: "Qty With Customers",
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
        setSelectedProduct({
          id: row._localId,
          poolId: row.id,
          productId: row.productId,
          productName: row.productName,
          poolName: row.name,
        });
        setIsCustomerInventoryOpen(true);
      },
    },
    {
      field: "quantityWithlaundry",
      headerName: "Qty In Laundry",
      type: "smallNumber",
    },
  ];

 const handlePoolChange = (e) => {
  const newPoolId = e.target.value;
  setPoolId(newPoolId);
  applyFilters(newPoolId, productStatus);
};

  const handleRowClick = (row) => {
    setSelectedProduct({
      id: row._localId,
      poolId: row.id,
      productId: row.productId,
      productName: row.productName,
      poolName: row.name,
    });
    setOpenTransactions(true);
  };

  // Fetching Pools
  const fetchPools = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getPools();

      const { poolList, poolProductDetails } = transformPoolsWithProducts(data);

      setPools(poolList);
      setPoolProducts(poolProductDetails);
      setFilteredProducts(poolProductDetails);
    } catch (e) {
      console.error(e);
      setError((prev) => prev || "Failed to load inventory pools.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);
  const applyFilters = (pool, status) => {
  let data = poolProducts;

  // Pool filter
  if (pool !== "all") {
    data = data.filter((p) => p.id == pool);
  }

  // Status filter
  if (status !== "all") {
    data = data.filter((p) =>
      status === "active" ? p.isActive : !p.isActive
    );
  }

  setFilteredProducts(data);
};
const handleStatusChange = (e) => {
  const status = e.target.value;
  setProductStatus(status);
  applyFilters(poolId, status);
};


  return (
    <Container disableGutters maxWidth="lg" sx={{ mb: 2 }}>
      <Stack spacing={1} sx={{ mb: 1 }}>
        {!!error && <Alert severity="error">{error}</Alert>}
      </Stack>

      {/* DropDown for selection of inventory pool */}
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box
          display={"flex"}
          gap={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          <Grid size={{ xs: 12, sm: 3 }}>
            {loading ? (
              "Loading..."
            ) : (
              <TextField
                select
                fullWidth
                size="small"
                label="Inventory Pool"
                value={poolId}
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
  label="Status"
  value={productStatus}
  onChange={handleStatusChange}
  sx={{ width: "12rem",ml:2 }}
>
 {PRODUCT_STATUS_OPTIONS.map((opt) => (
  <MenuItem key={opt.value} value={opt.value}>
    {opt.label}
  </MenuItem>
))}
</TextField>
          </Grid>

          {/* Create Button */}
          <Box sx={{ textAlign: "right" }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreatePoolDialog(true)}
              data-agent-action="create-pool"
            >
              Create Pool
            </Button>
          </Box>
        </Box>
      </Paper>

      <CreatePoolDialog
        open={openCreatePoolDialog}
        onClose={() => setOpenCreatePoolDialog(false)}
        onSave={() => {
          // Refresh pools after creation
          setOpenCreatePoolDialog(false);
          fetchPools();
        }}
      />

      <DataTable
        columns={poolColumns}
        rows={filteredProducts || []}
        rowKey={"_localId"}
        onRowClick={handleRowClick}
        selectedId={selectedProduct.id}
      />

      {/* Customer Inventory */}
      <CustomerInventoryDrawer
        product={selectedProduct}
        isOpen={isCustomerInventoryOpen}
        onClose={() => setIsCustomerInventoryOpen(false)}
      />

      {/* Transactions */}
      <InventoryPoolTransactionDrawer
        product={selectedProduct}
        open={openTransactions}
        onClose={() => setOpenTransactions(false)}
        onRefresh={fetchPools}
      />
    </Container>
  );
}

export default InventoryPoolTable;
