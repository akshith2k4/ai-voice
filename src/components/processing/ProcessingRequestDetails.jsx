import React from 'react';
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
    Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function ProcessingRequestDetails({ request, onClose }) {
    if (!request) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString();
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Processing Request Details
            </Typography>
            <Typography variant="body2" gutterBottom>
                Request ID: {request.id}
            </Typography>
            <Typography variant="body2" gutterBottom>
                Status: {request.status}
            </Typography>

            <Typography variant="h6" sx={{ mt: 2 }}>
                Products Scheduled for Processing
            </Typography>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Product Name</TableCell>
                            <TableCell>Quantity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {request.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default ProcessingRequestDetails; 