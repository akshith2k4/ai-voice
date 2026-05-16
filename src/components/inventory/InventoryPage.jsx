import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  TextField,
  MenuItem,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Chip,
} from '@mui/material';
import { Search as SearchIcon, PlaylistAdd as BulkIcon } from '@mui/icons-material';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import { parseItemIds } from '../../utils/inventoryUtils';
import CopyInventoryButton from '../../utils/CopyInventoryButton';
import InventoryList from './InventoryList';
import InventoryDetails from './InventoryDetails';
import InventoryPoolItemDetails from './InventoryPoolItemDetails';
import LoaderScreen from '../dashboard/LoaderScreen';
import TabsHeader from '../common/TabsHeader';
import GreenButton from '../common/GreenButton';
import CustomDrawer from '../common/CustomDrawer';
import BulkSearchDialog from './BulkSearchDialog';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'IN_CIRCULATION', label: 'In Circulation' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'SOILED', label: 'Soiled' },
];

const CONDITION_OPTIONS = [
  { value: 'FRESH', label: 'Fresh' },
  { value: 'SOILED', label: 'Soiled' },
  { value: 'HEAVY_SOILED', label: 'Heavy Soiled' },
  { value: 'DAMAGED', label: 'Damaged' },
];

function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialItemId = searchParams.get('itemId');
  const initialBulkItemIds = searchParams.get('bulkItemIds');
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialItemId || '');
  const [pagination, setPagination] = useState({
    currentPage: 0,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    productId: '',
    warehouseId: '',
    status: '',
    manufacturedDateFrom: new Date('2025-01-01T00:00:00Z').toISOString(),
    manufacturedDateTo: new Date().toISOString(),
  });

  const [appliedFilters, setAppliedFilters] = useState({
    productId: '',
    warehouseId: '',
    status: '',
    manufacturedDateFrom: new Date('2025-01-01T00:00:00Z').toISOString(),
    manufacturedDateTo: new Date().toISOString(),
    itemId: undefined,
    page: 0,
    size: 10,
    ...(initialItemId ? { _searchById: initialItemId } : {}),
    ...(initialBulkItemIds ? { _bulkSearchIds: initialBulkItemIds } : {}),
  });

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [conditionFilter, setConditionFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Derive unique location types from fetched data for the dropdown
  const locationOptions = useMemo(() => {
    const types = new Set();
    items.forEach((item) => {
      if (item.locationReferenceType) types.add(item.locationReferenceType);
    });
    return [...types].sort();
  }, [items]);

  // Local filters — applied client-side since no API support
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Condition filter
      if (conditionFilter) {
        const activePoolItems = (item.linkedPoolItems || []).filter(
          (pi) => pi.status === 'ACTIVE',
        );
        if (activePoolItems.length !== 1) return false;
        if (
          String(activePoolItems[0].condition || '').toUpperCase() !==
          conditionFilter
        )
          return false;
      }
      // Location filter
      if (locationFilter) {
        if (item.locationReferenceType !== locationFilter) return false;
      }
      return true;
    });
  }, [items, conditionFilter, locationFilter]);

  const fetchInventory = async (requestFilters) => {
    setIsLoadingInventory(true);
    try {
      const { _searchById, _bulkSearchIds, ...filterPayload } = requestFilters;

      if (_bulkSearchIds) {
        // Use the bulk-fetch API when navigated with multiple IDs
        const idList = _bulkSearchIds.split(',').map(Number).filter(Boolean);
        const result = await inventoryService.bulkFetchInventoryItems(idList);
        const items = Array.isArray(result) ? result : [];
        setItems(items);
        setPagination({
          currentPage: 0,
          totalItems: items.length,
          totalPages: 1,
          pageSize: items.length || 10,
        });
      } else if (_searchById) {
        // Use the GET /items/{id} API when searching by item ID
        const result = await inventoryService.searchInventoryItemsById(_searchById);
        const items = result ? (Array.isArray(result) ? result : [result]) : [];
        setItems(items);
        setPagination({
          currentPage: 0,
          totalItems: items.length,
          totalPages: 1,
          pageSize: items.length || 10,
        });
      } else {
        const result = await inventoryService.searchInventoryItems(filterPayload);
        setItems(result.items || []);
        setPagination({
          currentPage: result.currentPage ?? filterPayload.page ?? 0,
          totalItems: result.totalItems ?? 0,
          totalPages: result.totalPages ?? 0,
          pageSize: result.pageSize ?? filterPayload.size ?? 10,
        });
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  useEffect(() => {
    fetchInventory(appliedFilters);
  }, [appliedFilters]);

  // Clean up query params after reading them
  useEffect(() => {
    if (initialItemId || initialBulkItemIds) {
      searchParams.delete('itemId');
      searchParams.delete('bulkItemIds');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [products, warehouses] = await Promise.all([
          productService.getAllProducts(),
          inventoryService.getWarehouses()
        ]);
        setProducts(products);
        setWarehouses(warehouses);
      } catch (err) {
        console.error('Error fetching products or warehouses:', err);
      }
    }
    fetchData();
  }, []);

  const handlePageChange = (newPage) => {
    setAppliedFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (newPageSize) => {
    setAppliedFilters((prev) => ({
      ...prev,
      page: 0,
      size: newPageSize,
    }));
  };

  const handleSearch = () => {
    const trimmed = searchTerm?.trim();
    if (!trimmed) {
      setAppliedFilters({
        ...filters,
        page: 0,
        size: pagination.pageSize,
      });
      return;
    }
    // Check if it contains commas → bulk search
    if (trimmed.includes(',')) {
      const ids = parseItemIds(trimmed).join(',');
      setAppliedFilters({
        ...filters,
        page: 0,
        size: pagination.pageSize,
        _bulkSearchIds: ids || undefined,
      });
    } else {
      setAppliedFilters({
        ...filters,
        page: 0,
        size: pagination.pageSize,
        _searchById: trimmed || undefined,
      });
    }
  };

  const handleCopyToClipboard = () => {
    const text = formatInventoryForClipboard(filteredItems);
    navigator.clipboard.writeText(text).then(() => setCopySnackbar(true));
  };

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <TabsHeader
        tabs={[{ label: "Inventory Search", path: "/inventory", value: 0 }]}
        value={0}
      />
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            width: '100%',
          }}
        >
          {/* Left side: Search & Filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ width: 160 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Item ID..."
                value={searchTerm.includes(',') ? '' : searchTerm}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                  setSearchTerm(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                sx={{ backgroundColor: 'background.paper', borderRadius: 1 }}
                InputProps={{
                  startAdornment: searchTerm.includes(',') ? (
                    <Chip
                      size="small"
                      label={`${searchTerm.split(',').filter((s) => s.trim()).length} IDs`}
                      onDelete={() => setSearchTerm('')}
                      sx={{ mr: 0.5 }}
                    />
                  ) : (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setBulkDialogOpen(true)}
                        title="Bulk search"
                      >
                        <BulkIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { height: '40px' },
                }}
              />
            </Box>
            <Box sx={{ width: 140 }}>
              <TextField
                select fullWidth size="small" label="Warehouse"
                value={filters.warehouseId}
                onChange={(e) => setFilters((prev) => ({
                  ...prev,
                  warehouseId: e.target.value,
                }))}
              >
                <MenuItem value="">All</MenuItem>
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ width: 140 }}>
              <TextField
                select fullWidth size="small" label="Product"
                value={filters.productId}
                onChange={(e) => setFilters((prev) => ({
                  ...prev,
                  productId: e.target.value,
                }))}
              >
                <MenuItem value="">All</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ width: 140 }}>
              <TextField
                select fullWidth size="small" label="Status"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))}
              >
                <MenuItem value="">All</MenuItem>
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ width: 140 }}>
              <TextField
                select fullWidth size="small" label="Condition"
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {CONDITION_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ width: 140 }}>
              <TextField
                select fullWidth size="small" label="Location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {locationOptions.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
          {/* Right side: Search Button */}
          <Box sx={{ minWidth: 100 }}>
            <GreenButton onClick={handleSearch} fullWidth>
              Search
            </GreenButton>
          </Box>
        </Box>
      </Paper>

      {isLoadingInventory ? (
        <LoaderScreen />
      ) : (
        <InventoryList
          data={filteredItems}
          onSelect={(item) => setSelectedDetails({ type: 'ITEM', item })}
          onSelectPoolItem={(item) => setSelectedDetails({ type: 'POOL_ITEM', item })}
          pagination={pagination}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      )}

      <CustomDrawer
        anchor="right"
        open={Boolean(selectedDetails?.item && selectedDetails?.type === 'ITEM')}
        onClose={() => setSelectedDetails(null)}
        width={800}
      >
        <InventoryDetails
          item={selectedDetails?.item}
          onClose={() => setSelectedDetails(null)}
        />
      </CustomDrawer>

      <CustomDrawer
        anchor="right"
        open={Boolean(selectedDetails?.item && selectedDetails?.type === 'POOL_ITEM')}
        onClose={() => setSelectedDetails(null)}
        width={800}
      >
        <InventoryPoolItemDetails
          item={selectedDetails?.item}
          selectedPoolItemId={selectedDetails?.item?.selectedPoolItemId}
          onClose={() => setSelectedDetails(null)}
        />
      </CustomDrawer>
      <BulkSearchDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        initialValue={searchTerm.includes(',') ? searchTerm : ''}
        onSearch={(cleaned) => {
          setSearchTerm(cleaned);
          const ids = parseItemIds(cleaned).join(',');
          if (ids) {
            setAppliedFilters({
              ...filters,
              page: 0,
              size: pagination.pageSize,
              _bulkSearchIds: ids,
            });
          }
        }}
      />

      <CopyInventoryButton items={filteredItems} />
    </Container>
  );
}

export default InventoryPage;
