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
    Typography,
    Autocomplete,
    Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { inventoryService } from '../../services/inventoryService';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';

function CreateReservationDialog({ open, onClose, onSave }) {
    const [customerName, setCustomerName] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [customerOptions, setCustomerOptions] = useState([]);
    const [reservationType, setReservationType] = useState('');
    const [notes, setNotes] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [items, setItems] = useState([{ id: 1, productId: '', quantity: 0 }]);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const productsData = await productService.getAllProducts();
                setProducts(productsData);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoadingProducts(false);
            }
        };

        const fetchInventory = async () => {
            try {
                const inventoryData = await inventoryService.getCurrentInventory(localStorage.getItem('branchId') || 'default-branch-id');
                // setBuckets(inventoryData.buckets || []); // Extract buckets from inventory data
            } catch (error) {
                console.error('Error fetching inventory:', error);
            }
        };

        fetchProducts();
        fetchInventory();
    }, []);

    useEffect(() => {
        if (open) {
            setCustomerName('');
            setCustomerId('');
            setCustomerOptions([]);
            setReservationType('');
            setNotes('');
            setStartDate('');
            setEndDate('');
            setItems([{ id: 1, productId: '', quantity: 0 }]);
            setSelectedCustomer(null);
        }
    }, [open]);

    const fetchCustomerOptions = async (searchTerm) => {
        try {
            const results = await customerService.searchCustomersByName(searchTerm);
            setCustomerOptions(results);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    };

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
        if (!customerId) {
            alert('Please select a customer.');
            return;
        }
        const requestData = {
            customerId,
            branchId: localStorage.getItem('branchId') || 'default-branch-id',
            reservationType: reservationType,
            notes,
            startDate,
            endDate,
            items
        };

        try {
            await inventoryService.createReservation(requestData, customerId);
            onSave();
            onClose();
        } catch (error) {
            const backendMessage = error.response?.data?.message || 'Failed to create reservation. Please try again.';
            setSnackbarMessage(backendMessage);
            setSnackbarOpen(true);
        }
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Create Inventory Reservation</DialogTitle>
            <DialogContent>
                <Grid container spacing={1}>
                    <Grid item xs={12} sm={12} fullWidth>
                        <Autocomplete fullWidth
                            options={customerOptions}
                            getOptionLabel={(option) => option.name}
                            value={selectedCustomer}
                            onInputChange={(event, newInputValue) => {
                                fetchCustomerOptions(newInputValue);
                            }}
                            onChange={(event, newValue) => {
                                setSelectedCustomer(newValue);
                                setCustomerId(newValue ? newValue.id : '');
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Customer Name"
                                    margin="dense"
                                    size="small"
                                    fullWidth
                                />
                            )}
                        />
                        {selectedCustomer && (
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                Current Customer: {selectedCustomer.name}
                            </Typography>
                        )}
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Reservation Type</InputLabel>
                            <Select
                                value={reservationType}
                                onChange={(e) => setReservationType(e.target.value)}
                            >
                                <MenuItem value="FIXED">Fixed</MenuItem>
                                <MenuItem value="FLEXIBLE">Flexible</MenuItem>
                                <MenuItem value="ROTATIONAL">Rotational</MenuItem>

                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Notes"
                            fullWidth
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6} sx={{ mt: 1 }}>
                        <TextField
                            label="Start Date"
                            type="datetime-local"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6} sx={{ mt: 1 }}>
                        <TextField
                            label="End Date"
                            type="datetime-local"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">Items</Typography>
                        {items.map((item, index) => (
                            <Grid container spacing={2} key={item.id} alignItems="center" sx={{ mb: 1 }}>
                                <Grid item xs={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Product</InputLabel>
                                        <Select
                                            value={item.productId}
                                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                        >
                                            {products.map((product) => (
                                                <MenuItem key={product.id} value={product.id}>
                                                    {product.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={3}>
                                    <TextField
                                        label="Quantity"
                                        type="number"
                                        fullWidth
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={1}>
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
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                message={snackbarMessage}
                action={
                    <Button color="inherit" size="small" onClick={handleSnackbarClose}>
                        Close
                    </Button>
                }
            />
        </Dialog>
    );
}

export default CreateReservationDialog; 