import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { inventoryService } from '../../services/inventoryService';

const formatQuantityWithUnit = (quantity, unit) => {
    if (unit.toLowerCase() === 'kg') {
        return `${quantity/1000} kg`;  // Convert grams to kg
    }
    return `${quantity} ${unit}`;
};

function StockDetails({ stock, onClose }) {
    const [inwardRequests, setInwardRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (stock) {
            loadInwardRequests();
        }
    }, [stock]);

    const loadInwardRequests = async () => {
        try {
            setLoading(true);
            const data = await inventoryService.getInwardingRequests();
            const filteredRequests = data.filter(req => req.product.id === stock.product.id);
            setInwardRequests(filteredRequests);
        } catch (error) {
            console.error('Error loading inward requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInwardRequests = async (bucketId) => {
        try {
            const data = await inventoryService.getInwardRequestsByBucketId(bucketId);
            setInwardRequests(data);
        } catch (error) {
            console.error('Error fetching inward requests:', error);
        }
    };

    if (!stock) return null;

    return (
        <Box sx={{ height: '100%', bgcolor: '#fff' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ color: '#1a1a1a' }}>
                        Stock Details
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2 }}>
                {/* Product Details */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                        Product Name
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1a1a1a' }}>
                        {stock.product.name}
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                        Current Stock
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1a1a1a' }}>
                        {formatQuantityWithUnit(stock.quantity, stock.product.unit)}
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                        Minimum Stock Level
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1a1a1a' }}>
                        {formatQuantityWithUnit(stock.minimumQuantity, stock.product.unit)}
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                        Status
                    </Typography>
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            color: stock.status === 'LOW_STOCK' ? '#d32f2f' : '#1a1a1a'
                        }}
                    >
                        {stock.status}
                    </Typography>
                </Box>

                {/* Inward History */}
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ color: '#1a1a1a', mb: 2 }}>
                        Inward History
                    </Typography>
                    <TableContainer component={Paper} elevation={0} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: '#666', fontWeight: 500 }}>Date</TableCell>
                                    <TableCell sx={{ color: '#666', fontWeight: 500 }} align="right">Quantity</TableCell>
                                    <TableCell sx={{ color: '#666', fontWeight: 500 }}>Vendor</TableCell>
                                    <TableCell sx={{ color: '#666', fontWeight: 500 }} align="right">Unit Price</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {inwardRequests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell sx={{ color: '#1a1a1a' }}>
                                            {new Date(request.inwardingDate).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell sx={{ color: '#1a1a1a' }} align="right">
                                            {formatQuantityWithUnit(request.quantity, stock.product.unit)}
                                        </TableCell>
                                        <TableCell sx={{ color: '#1a1a1a' }}>
                                            {request.vendor.name}
                                        </TableCell>
                                        <TableCell sx={{ color: '#1a1a1a' }} align="right">
                                            ₹{request.unitPrice}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {inwardRequests.length === 0 && (
                                    <TableRow>
                                        <TableCell 
                                            colSpan={4} 
                                            align="center"
                                            sx={{ color: '#666' }}
                                        >
                                            No inward history found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Inward Requests for {stock.product.name}
                    </Typography>
                    <List>
                        {inwardRequests.map((request) => (
                            <ListItem key={request.id}>
                                <ListItemText
                                    primary={`Request ID: ${request.id}`}
                                    secondary={`Quantity: ${request.quantity}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Box>
        </Box>
    );
}

export default StockDetails; 