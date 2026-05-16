import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { productService } from '../../services/productService';
import { vendorService } from '../../services/vendorService';

function StockInwardDialog({ open, onClose, onSave }) {
    const [inward, setInward] = useState({
        productId: '',
        vendorId: '',
        inwardingDate: new Date(),
        quantity: '',
        unitPrice: '',
        invoiceNumber: '',
        invoiceDate: new Date()
    });

    const [products, setProducts] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [productsData, vendorsData] = await Promise.all([
                productService.getAllProducts(),
                vendorService.getAllVendors()
            ]);
            setProducts(productsData);
            setVendors(vendorsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setInward({
            ...inward,
            [field]: value
        });
    };

    const handleSave = () => {
        onSave(inward);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>New Stock Inward</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            fullWidth
                            label="Product"
                            value={inward.productId}
                            onChange={(e) => handleChange('productId', e.target.value)}
                        >
                            {products.map((product) => (
                                <MenuItem key={product.id} value={product.id}>
                                    {product.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            fullWidth
                            label="Vendor"
                            value={inward.vendorId}
                            onChange={(e) => handleChange('vendorId', e.target.value)}
                        >
                            {vendors.map((vendor) => (
                                <MenuItem key={vendor.id} value={vendor.id}>
                                    {vendor.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <DateTimePicker
                            label="Inwarding Date"
                            value={inward.inwardingDate}
                            onChange={(date) => handleChange('inwardingDate', date)}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Quantity"
                            type="number"
                            value={inward.quantity}
                            onChange={(e) => handleChange('quantity', parseInt(e.target.value))}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Unit Price"
                            type="number"
                            value={inward.unitPrice}
                            onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Invoice Number"
                            value={inward.invoiceNumber}
                            onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <DateTimePicker
                            label="Invoice Date"
                            value={inward.invoiceDate}
                            onChange={(date) => handleChange('invoiceDate', date)}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default StockInwardDialog; 