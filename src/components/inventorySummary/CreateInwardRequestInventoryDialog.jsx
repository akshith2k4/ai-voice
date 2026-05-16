import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    IconButton,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { vendorService } from '../../services/vendorService';
import { createInwardRequest } from '../../services/inwardRequestService';

function CreateInwardRequestInventoryDialog({ open, onClose, onSave, warehouses }) {
    const [vendorId, setVendorId] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [inwardDate, setInwardDate] = useState('');
    const [notes, setNotes] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [items, setItems] = useState([{ id: 1, productId: '', quantity: 0, remarks: '', manufacturedDate: '' }]);
    const [products, setProducts] = useState([]);
    const [vendors, setVendors] = useState([]);

    useEffect(() => {
        if (open) {
            fetchProducts();
            fetchVendors();
            resetForm();
        }
    }, [open]);

    const fetchProducts = async () => {
        const productsData = await productService.getAllProducts();
        setProducts(productsData);
    };

    const fetchVendors = async () => {
        const vendorsData = await vendorService.getAllVendors();
        setVendors(vendorsData);
    };

    const resetForm = () => {
        setVendorId('');
        setReferenceNumber('');
        setInwardDate('');
        setNotes('');
        setWarehouseId('');
        setItems([{ id: 1, productId: '', quantity: 0, remarks: '', manufacturedDate: '' }]);
    };

    const handleAddItem = () => {
        setItems([...items, { id: items.length + 1, productId: '', quantity: 0, remarks: '', manufacturedDate: '' }]);
    };

    const handleRemoveItem = (index) => {
        const updatedItems = items.filter((_, i) => i !== index);
        setItems(updatedItems);
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = items.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        );
        setItems(updatedItems);
    };

    const handleSave = async () => {
        const branchId = localStorage.getItem('branchId');
        const requestData = {
            inwardDate,
            referenceNumber,
            warehouseId,
            vendorId,
            vendorName: vendors.find(v => v.id === vendorId)?.name,
            branchId,
            notes,
            items: items.map(({ productId, quantity, remarks, manufacturedDate }) => ({
                productId,
                quantity,
                remarks,
                manufacturedDate,
                unitPrice: 0,
                totalPrice: 0
            }))
        };

        await createInwardRequest(requestData);
        onSave();
        onClose();

        // // Read old data from localStorage
        // const existing = JSON.parse(localStorage.getItem('inwardRequests') || '[]');

        // // Add auto-generated fields like id, createdAt, etc.
        // const newInwardRequest = {
        //     id: existing.length + 1,
        //     status: 'RECEIVED',
        //     createdAt: new Date().toISOString(),
        //     updatedAt: new Date().toISOString(),
        //     vendorName: vendors.find(v => v.id === vendorId)?.name || '',
        //     ...requestData,
        //     items: requestData.items.map((item, i) => ({
        //         id: i + 1,
        //         ...item,
        //         productName: products.find(p => p.id === item.productId)?.name || '',
        //         productCode: products.find(p => p.id === item.productId)?.code || 'PRD-XXX'
        //     }))
        // };

        // // Save back to localStorage
        // localStorage.setItem('inwardRequests', JSON.stringify([...existing, newInwardRequest]));

        // Notify parent
        // onSave();
        // onClose();

    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1.3rem' }}>Create Inward Request</DialogTitle>

            <DialogContent sx={{ py: 2 }}>
                <Box>
                    {/* Vendor and Warehouse */}
                    <Box display={'flex'} gap={2} sx={{ my: 1 }}>
                        <Box flex={1} item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Vendor</InputLabel>
                                <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)} label="Vendor">
                                    {vendors.map((vendor) => (
                                        <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <Box flex={1} item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Warehouse</InputLabel>
                                <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} label="Warehouse">
                                    {warehouses.length > 0
                                        ? warehouses.map((w) => (
                                            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                        ))
                                        : <MenuItem disabled>No warehouses found</MenuItem>}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    {/* Reference Number & Date & Notes */}
                    <Box display={'flex'} gap={2} sx={{ my: 2 }}>

                        <Box flex={1} item xs={12} sm={6}>
                            <TextField
                                label="Reference Number"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                fullWidth
                                size="small"
                            />
                        </Box>
                        <Box flex={1} item xs={12} sm={6}>
                            <TextField
                                label="Inward Date"
                                type="datetime-local"
                                value={inwardDate}
                                onChange={(e) => setInwardDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                size="small"
                            />
                        </Box>
                        <Box flex={1} item xs={12} sm={6}>
                            <TextField
                                label="Notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                multiline
                                fullWidth
                                size="small"
                            />
                        </Box>
                    </Box>

                    {/* Items List */}
                    <Box item xs={12}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Items
                        </Typography>

                        {items.map((item, index) => (
                            <Box display={'flex'} gap={2} alignItems="center" key={index} sx={{ my: 2 }}>
                                <Box flex={1} item xs={12} sm={4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Product</InputLabel>
                                        <Select
                                            value={item.productId}
                                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                            label="Product"
                                        >
                                            {products.map((p) => (
                                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                <Box flex={1} item xs={12} sm={2}>
                                    <TextField
                                        label="Quantity"
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                </Box>

                                <Box flex={1} item xs={12} sm={4}>
                                    <TextField
                                        label="Manufactured Date"
                                        type="date"
                                        value={item.manufacturedDate}
                                        onChange={(e) => handleItemChange(index, 'manufacturedDate', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        size="small"
                                    />
                                </Box>

                                <Box item xs={12} sm={2}>
                                    <IconButton onClick={() => handleRemoveItem(index)} sx={{ mt: '4px' }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>
                        ))}

                        <Button
                            startIcon={<AddIcon />}
                            variant="outlined"
                            size="small"
                            sx={{ mt: 2, textTransform: 'none' }}
                            onClick={handleAddItem}
                        >
                            Add Item
                        </Button>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    sx={{
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                        boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)'
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );


}

export default CreateInwardRequestInventoryDialog;
