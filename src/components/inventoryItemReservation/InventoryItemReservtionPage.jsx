import React, { useEffect, useState, useMemo } from 'react';
import debounce from 'lodash.debounce';
import {
  Box, Typography, Paper, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  FormControl, InputLabel, Select, MenuItem, Checkbox, Button
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import { reservationService } from '../../services/reservationService';
import { DATE_TIME, formatCustomDate } from '../../utils/dateUtils';

function InventoryItemReservtionPage() {
  const location = useLocation();
  const { reservation, customer, products } = location.state || {};
  const reservationId = reservation?.id;
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [inventoryOverview, setInventoryOverview] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [rfidTaggedOnly, setRfidTaggedOnly] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [filters, setFilters] = useState({ status: '' });
  const [reservedItemCounts, setReservedItemCounts] = useState({});

  useEffect(() => {
    fetchInventoryOverview();
    populateReservedCountsFromReservation();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchInventoryItems();
    }
  }, [selectedWarehouseId, selectedProduct, rfidTaggedOnly, filters.status]);

  const populateReservedCountsFromReservation = () => {
    const reservedCounts = {};
    (reservation?.items || []).forEach(item => {
      reservedCounts[item.productId] = item.inventoryItemIds?.length || 0;
    });
    setReservedItemCounts(reservedCounts);
  };

  const fetchInventoryItemsDebounced = debounce(async (requestBody, setAllInventoryItems) => {
    try {
      const res = await inventoryService.searchInventoryItems(requestBody);
      setAllInventoryItems(res.items);
    } catch (error) {
      console.error('Failed to fetch inventory items:', error);
    }
  }, 300);

  const fetchInventoryItems = () => {
    const requestBody = {
      productId: selectedProduct !== "" ? parseInt(selectedProduct) : null,
      warehouseId: selectedWarehouseId,
      status: filters.status !== "" ? filters.status : null,
      page: 0,
      size: 1000,
      sortBy: 'manufacturedDate',
      sortDirection: 'DESC'
    };
    fetchInventoryItemsDebounced(requestBody, setAllInventoryItems);
  };

  const fetchInventoryOverview = async () => {
    const branchId = localStorage.getItem('branchId');
    const res = await inventoryService.getCurrentInventory(branchId);
    setInventoryOverview(res.products);

    const firstProduct = res.products?.[0];
    if (!firstProduct || !firstProduct.warehouse?.warehouseId) {
      console.warn('⚠️ No warehouse ID found in inventory overview.');
      return;
    }

    const firstWarehouseId = firstProduct.warehouse.warehouseId;
    setSelectedWarehouseId(firstWarehouseId);
  };

const handleReserve = async () => {
  const productsToReserve = [];
  const warningMessages = [];

  products.forEach((product) => {
    const productId = product.productId;
    const requiredQty = product.quantity;
    const alreadyReservedQty = reservedItemCounts[productId] || 0;
    const selectedIds = selectedItems[productId] || [];
    const selectedQty = selectedIds.length;
    const remainingQty = Math.max(0, requiredQty - alreadyReservedQty);

    if (selectedQty === 0) return;

    if (selectedQty > remainingQty) {
      // Trim selection and warn
      const trimmedIds = selectedIds.slice(0, remainingQty);
      if (trimmedIds.length > 0) {
        productsToReserve.push({ productId, inventoryItemIds: trimmedIds });
        warningMessages.push(
          `${product.productName}: Reserved ${trimmedIds.length} out of ${selectedQty} (Required: ${requiredQty}, Already Reserved: ${alreadyReservedQty})`
        );
      } else {
        warningMessages.push(
          `${product.productName}: Already reserved fully (${alreadyReservedQty}/${requiredQty}). Skipped.`
        );
      }
    } else {
      productsToReserve.push({ productId, inventoryItemIds: selectedIds });
    }
  });

  if (productsToReserve.length === 0) {
    alert("⚠️ No valid items to reserve.");
    return;
  }

  try {
    await reservationService.updateInventoryItems(reservationId, { products: productsToReserve });

    if (warningMessages.length > 0) {
      alert(`⚠️ Partial reservation done:\n\n${warningMessages.join('\n')}`);
    } else {
      alert('✅ Reservation completed!');
    }

    populateReservedCountsFromReservation();
    setSelectedItems({});
  } catch (error) {
    console.error("❌ Reservation failed:", error);
    alert("Error occurred while updating reservation.");
  }
};


  const toggleItemSelection = (productId, itemId) => {
    setSelectedItems((prev) => {
      const existing = prev[productId] || [];
      return {
        ...prev,
        [productId]: existing.includes(itemId)
          ? existing.filter(id => id !== itemId)
          : [...existing, itemId]
      };
    });
  };

  const filteredItems = useMemo(() => {
    return allInventoryItems.filter(item => {
      if (rfidTaggedOnly && !item.rfidTagged) return false;
      return true;
    });
  }, [allInventoryItems, rfidTaggedOnly]);

  const handleProductChange = (e) => {
    setSelectedProduct(e.target.value);
  };

  const handleRfidToggle = () => {
    setRfidTaggedOnly(!rfidTaggedOnly);
  };

  const getSelectedQty = (productId) => {
    return selectedItems[productId]?.length || 0;
  };

const handleAutoSelectItems = () => {
  const updatedSelectedItems = {};
  const fallbackWarnings = [];

  products.forEach((product) => {
    const productId = product.productId;
    const requiredQty = product.quantity;
    const alreadyReservedQty = reservedItemCounts[productId] || 0;
    const remainingQty = Math.max(0, requiredQty - alreadyReservedQty);

    const availableItems = allInventoryItems.filter(
      (item) => item.productId === productId && item.status === "ACTIVE"
    );

    if (remainingQty === 0) {
      fallbackWarnings.push(`${product.productName}: Already fully reserved.`);
      return;
    }

    if (availableItems.length >= remainingQty) {
      updatedSelectedItems[productId] = availableItems.slice(0, remainingQty).map(item => item.id);
    } else {
      updatedSelectedItems[productId] = availableItems.map(item => item.id);
      fallbackWarnings.push(`${product.productName}: Needed ${remainingQty}, but only ${availableItems.length} available.`);
    }
  });

  setSelectedItems(updatedSelectedItems);

  if (fallbackWarnings.length > 0) {
    alert(`⚠️ Auto-selected partially:\n\n${fallbackWarnings.join('\n')}`);
  } else {
    alert("✅ Auto-selection successful for all products.");
  }
};

const handleAutoSelectSingle = (productId, requiredQty) => {
  const alreadyReserved = reservedItemCounts[productId] || 0;
  const remainingQty = Math.max(0, requiredQty - alreadyReserved);

  const availableItems = allInventoryItems.filter(
    (item) => item.productId === productId && item.status === 'ACTIVE'
  );

  if (remainingQty === 0) {
    alert(`⚠️ Already fully reserved for Product ID ${productId}`);
    return;
  }

  const itemsToSelect = availableItems.slice(0, remainingQty);

  if (itemsToSelect.length === 0) {
    alert(`❌ No available inventory for Product ID ${productId}`);
    return;
  }

  setSelectedItems((prev) => ({
    ...prev,
    [productId]: itemsToSelect.map(i => i.id),
  }));

  if (itemsToSelect.length < remainingQty) {
    alert(`⚠️ Only ${itemsToSelect.length} items selected out of ${remainingQty} for Product ID ${productId}`);
  } else {
    alert(`✅ Selected ${itemsToSelect.length} items for Product ID ${productId}`);
  }
};


  return (
    <>
      <Typography variant="h5" px={3} fontWeight={700}>Inventory Item Reservation</Typography>
      <Box sx={{ display: 'flex', p: 2, gap: 2 }}>
        <Box flex={2}>
          <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Product</InputLabel>
              <Select
                value={selectedProduct}
                onChange={handleProductChange}
                label="Product"
              >
                <MenuItem value="">All</MenuItem>
                {products.map(p => (
                  <MenuItem key={p.productId} value={String(p.productId)}>
                    {p.productName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="RESERVED">Reserved</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant={rfidTaggedOnly ? 'contained' : 'outlined'}
              onClick={handleRfidToggle}
            >
              RFID Tagged
            </Button>
          </Paper>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Manufacturing Date</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id} sx={item.status === 'RESERVED' ? { backgroundColor: '#f0f0f0' } : {}}>
                    <TableCell>
                      <Checkbox
                        checked={
                          item.status === 'RESERVED' ||
                          (selectedItems[item.productId]?.includes(item.id) || false)}
                        onChange={() => toggleItemSelection(item.productId, item.id)}
                        disabled={item.status === 'RESERVED'}
                      />
                    </TableCell>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{formatCustomDate(item.manufacturedDate, DATE_TIME)}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box flex={1} sx={{ position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
          <Paper sx={{ p: 1.3, mb: 2 }}>
            <Typography variant="h6">Customer Details</Typography>
            <Typography variant="body2">{customer?.name || 'N/A'}</Typography>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Items to Reserve</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Product Name</strong></TableCell>
                  <TableCell align="right"><strong>Required Qty</strong></TableCell>
                  <TableCell align="right"><strong>Selected Qty</strong></TableCell>
                  <TableCell align="right"><strong>Reserved Qty</strong></TableCell>
                  <TableCell align="right"><strong>Populate</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell>{p.productName}</TableCell>
                    <TableCell align="right">{p.quantity}</TableCell>
                    <TableCell align="right">{getSelectedQty(p.productId)}</TableCell>
                    <TableCell align="right">{reservedItemCounts[p.productId] || 0}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => handleAutoSelectSingle(p.productId, p.quantity)}>Auto</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              fullWidth
              variant="contained"
              onClick={handleReserve}
              sx={{ mt: 2, background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)' }}
            >
              Reserve
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleAutoSelectItems}
              sx={{ mt: 1 }}
            >
              Auto Select Items
            </Button>
          </Paper>
        </Box>
      </Box>
    </>
  );
}

export default InventoryItemReservtionPage;
