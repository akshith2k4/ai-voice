import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    IconButton,
    Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { vendorService } from '../../services/vendorService';
import CustomSnackbar from '../layout/CustomSnackbar';

function CreateInwardRequestDialog({ open, onClose, onSave, buckets }) {
    const [vendorId, setVendorId] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [inwardDate, setInwardDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ id: 1, productId: '', quantity: 0 }]);
    const [products, setProducts] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [selectedBucketId, setSelectedBucketId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [CustomSnackbarOpen, setCustomSnackbarOpen] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const productsData = await productService.getAllProducts();
                setProducts(productsData);
            } catch (error) {
                const backendMessage = error.response?.data?.message || 'Failed to fetch products. Please try again.';
                setErrorMessage(backendMessage);
                setCustomSnackbarOpen(true);
            } finally {
                setLoadingProducts(false);
            }
        };

        const fetchVendors = async () => {
            try {
                const vendorsData = await vendorService.getAllVendors();
                setVendors(vendorsData);
            } catch (error) {
                const backendMessage = error.response?.data?.message || 'Failed to fetch vendors. Please try again.';
                setErrorMessage(backendMessage);
                setCustomSnackbarOpen(true);
            }
        };

        fetchProducts();
        fetchVendors();
    }, []);

    // Reset fields when the dialog is opened
    useEffect(() => {
        if (open) {
            setVendorId('');
            setReferenceNumber('');
            setInwardDate('');
            setNotes('');
            setItems([{ id: 1, productId: '', quantity: 0 }]);
            setSelectedBucketId('');
        }
    }, [open]);

    const handleAddItem = () => {
        setItems([...items, { id: items.length + 1, productId: '', quantity: 0 }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = items.map((item, i) => 
            i === index ? { ...item, [field]: value } : item
        );
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!selectedBucketId) {
            alert('Please select a bucket.');
            return;
        }
        const requestData = {
            vendorId,
            referenceNumber,
            inwardDate,
            notes,
            items,
            branchId: localStorage.getItem('branchId') || 'default-branch-id',
            bucketId: selectedBucketId
        };

        try {
            await inventoryService.createInwardRequest(requestData);
            onSave(selectedBucketId);
            onClose();
        } catch (error) {
            const backendMessage = error.response?.data?.message || 'Failed to create inward request. Please try again.';
            setErrorMessage(backendMessage);
            setCustomSnackbarOpen(true);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Create Inward Request</DialogTitle>
            <DialogContent>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Vendor</InputLabel>
                            <Select
                                value={vendorId}
                                onChange={(e) => setVendorId(e.target.value)}
                            >
                                {vendors.map((vendor) => (
                                    <MenuItem key={vendor.id} value={vendor.id}>
                                        {vendor.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Reference Number"
                            fullWidth
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Inward Date"
                            type="datetime-local"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={inwardDate}
                            onChange={(e) => setInwardDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Notes"
                            fullWidth
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel id="bucket-select-label">Select Bucket</InputLabel>
                            <Select
                                labelId="bucket-select-label"
                                value={selectedBucketId}
                                onChange={(e) => setSelectedBucketId(e.target.value)}
                                label="Select Bucket"
                            >
                                {buckets.map((bucket) => (
                                    <MenuItem key={bucket.bucketId} value={bucket.bucketId}>
                                        {bucket.bucketName || 'Unnamed Bucket'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">Items</Typography>
                        {items.map((item, index) => (
                            <Grid container spacing={2} key={item.id}>
                                <Grid item xs={5}>
                                    <FormControl fullWidth>
                                        <InputLabel>Product</InputLabel>
                                        <Select
                                            value={item.productId}
                                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                            disabled={loadingProducts}
                                        >
                                            {products.map((product) => (
                                                <MenuItem key={product.id} value={product.id}>
                                                    {product.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={5}>
                                    <TextField
                                        label="Quantity"
                                        type="number"
                                        fullWidth
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={2}>
                                    <IconButton onClick={() => handleRemoveItem(index)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Grid>
                            </Grid>
                        ))}
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={handleAddItem}
                            sx={{ mt: 2 }}
                        >
                            Add Item
                        </Button>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained">Save</Button>
            </DialogActions>

            <CustomSnackbar
                open={CustomSnackbarOpen}
                message={errorMessage}
                onClose={() => setCustomSnackbarOpen(false)}
            />
        </Dialog>
    );
}

export default CreateInwardRequestDialog; 