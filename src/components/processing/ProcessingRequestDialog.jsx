import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Box,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { soiledService } from '../../services/soiledService';
import { productService } from '../../services/productService';
import { vendorService } from '../../services/vendorService';

function ProcessingRequestDialog({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    processingType: 'INHOUSE_PROCESSING',
    vendorId: '',
    items: [],
    selectedProduct: '',
    quantity: '',
    remarks: '',
    notes: ''
  });
  const [soiledInventory, setSoiledInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  useEffect(() => {
    if (formData.processingType === 'OUTSOURCE_PROCESSING') {
      fetchVendors();
    }
  }, [formData.processingType]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [inventoryData, productsData] = await Promise.all([
        soiledService.getAllSoiledInventory(),
        productService.getAllProducts()
      ]);
      setSoiledInventory(inventoryData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await vendorService.getVendors();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleAddItem = () => {
    if (!formData.selectedProduct || !formData.quantity) return;

    const product = products.find(p => p.id === formData.selectedProduct);
    if (product) {
      setFormData({
        ...formData,
        items: [...formData.items, {
          productId: product.id,
          quantity: parseInt(formData.quantity),
          remarks: formData.remarks || ''
        }],
        selectedProduct: '',
        quantity: '',
        remarks: ''
      });
    }
  };

  const handleRemoveItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({
      ...formData,
      items: newItems
    });
  };

  const handleSubmit = async () => {
    try {
      const requestData = {
        processingType: formData.processingType,
        vendorId: formData.vendorId,
        notes: formData.notes,
        items: formData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          remarks: item.remarks
        }))
      };
      console.log('Submitting request:', requestData);
      await onSave(requestData);
      onClose();
    } catch (error) {
      console.error('Failed to submit request:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>New Processing Request</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Processing Type</InputLabel>
            <Select
              value={formData.processingType}
              onChange={(e) => setFormData({
                ...formData,
                processingType: e.target.value
              })}
            >
              <MenuItem value="INHOUSE_PROCESSING">In-house Processing</MenuItem>
              <MenuItem value="OUTSOURCE_PROCESSING">Outsource Processing</MenuItem>
            </Select>
          </FormControl>

          {formData.processingType === 'OUTSOURCE_PROCESSING' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Vendor</InputLabel>
              <Select
                value={formData.vendorId}
                onChange={(e) => setFormData({
                  ...formData,
                  vendorId: e.target.value
                })}
              >
                {vendors.map((vendor) => (
                  <MenuItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <FormControl sx={{ flex: 2 }}>
              <InputLabel>Select Product</InputLabel>
              <Select
                value={formData.selectedProduct}
                onChange={(e) => setFormData({
                  ...formData,
                  selectedProduct: e.target.value
                })}
              >
                {products.map(product => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              sx={{ flex: 1 }}
              type="number"
              label="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({
                ...formData,
                quantity: e.target.value
              })}
            />

            <TextField
              sx={{ flex: 2 }}
              label="Remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({
                ...formData,
                remarks: e.target.value
              })}
            />

            <Button
              variant="contained"
              onClick={handleAddItem}
              disabled={!formData.selectedProduct || !formData.quantity}
              sx={{ height: 40 }}
            >
              Add Item
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="tiny">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Remarks</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {products.find(p => p.id === item.productId)?.name}
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>{item.remarks}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleRemoveItem(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({
              ...formData,
              notes: e.target.value
            })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={formData.items.length === 0}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProcessingRequestDialog; 