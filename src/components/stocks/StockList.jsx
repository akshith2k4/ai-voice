import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Box,
    Typography,
    Drawer,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { inventoryService } from '../../services/inventoryService';
import CreateInwardRequestDialog from './CreateInwardRequestDialog';
import StockDetails from './StockDetails';
import CreateReservationDialog from './CreateReservationDialog';
import { productService } from '../../services/productService';
import { vendorService } from '../../services/vendorService';
import CustomSnackbar from '../layout/CustomSnackbar';
function StockList() {
    const [inventory, setInventory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [openReservationDialog, setOpenReservationDialog] = useState(false);
    const [CustomSnackbarOpen, setCustomSnackbarOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [inventoryId, setInventoryId] = useState(null);

    const [selectedReservation, setSelectedReservation] = useState(null);

    // Fetch branchId from local storage
    const branchId = localStorage.getItem('branchId') || 'default-branch-id'; // Replace 'default-branch-id' with a fallback if needed

    const fetchStocks = async () => {
        try {
            setLoading(true);
            const data = await inventoryService.getCurrentInventory(branchId);
            setInventory(data);
            setInventoryId(data.inventoryId);
        } catch (error) {
            const backendMessage = error.response?.data?.message || 'Failed to fetch stock data. Please try again.';
            setErrorMessage(backendMessage);
            setCustomSnackbarOpen(true);
        } finally {
            setLoading(false);
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

    const fetchProducts = async () => {
        try {
            const productsData = await productService.getAllProducts();
            setProducts(productsData);
        } catch (error) {
            const backendMessage = error.response?.data?.message || 'Failed to fetch products. Please try again.';
            setErrorMessage(backendMessage);
            setCustomSnackbarOpen(true);
        }
    };

    const fetchReservations = async () => {
        try {
            const data = await inventoryService.getReservationsByBranchAndPoolId(branchId);
            setReservations(data);
        } catch (error) {
            console.error('Failed to fetch reservations:', error);
        }
    };

    useEffect(() => {
        fetchStocks();
        fetchVendors();
        fetchProducts();
        fetchReservations();
    }, [branchId]);

    const handleReservationClick = (reservation) => {
        setSelectedReservation(reservation);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Customer Inventory Reservations</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenReservationDialog(true)}
                    sx={{
                        px: 2,
                        mb: 2,
                        background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                        boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
                    }}

                >
                    Create Reservation
                </Button>
            </Box>
            <Paper elevation={3}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Customer Name</TableCell>
                                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Reservation Date</TableCell>
                                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Reservation Type</TableCell>
                                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Items</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reservations.map((reservation) => (

                                <TableRow key={reservation.id} hover sx={{
                                    cursor: 'pointer',
                                    '&:nth-of-type(odd)': {
                                        backgroundColor: 'background.default',
                                    },
                                    '& td': { py: 1 }
                                }} onClick={() => handleReservationClick(reservation)}>
                                    <TableCell>{reservation.customerName}</TableCell>
                                    <TableCell>{new Date(reservation.reservationDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{reservation.reservationType}</TableCell>
                                    <TableCell>{reservation.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <CustomSnackbar
                open={CustomSnackbarOpen}
                message={errorMessage}
                onClose={() => setCustomSnackbarOpen(false)}
            />

            <CreateReservationDialog
                open={openReservationDialog}
                onClose={() => setOpenReservationDialog(false)}
                onSave={fetchReservations}
            />

            <Drawer
                anchor="right"
                open={Boolean(selectedReservation)}
                onClose={() => setSelectedReservation(null)}
                PaperProps={{
                    elevation: 1,
                    sx: {
                        width: 450,
                        backgroundColor: '#ffffff !important',
                        boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.1)',
                    }
                }}
            >
                {selectedReservation && (
                    <Box sx={{ p: 2, backgroundColor: '#ffffff' }}>
                        <Typography variant="h6" gutterBottom sx={{ color: '#000000', fontWeight: 'bold' }}>
                            Reservation Details
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#000000', fontWeight: 'bold' }}>Customer: <span style={{ fontWeight: 'normal' }}>{selectedReservation.customerName}</span></Typography>
                        <Typography variant="body2" sx={{ color: '#000000', fontWeight: 'bold' }}>Reservation Type: <span style={{ fontWeight: 'normal' }}>{selectedReservation.reservationType}</span></Typography>
                        <Typography variant="body2" sx={{ color: '#000000', fontWeight: 'bold' }}>Notes: <span style={{ fontWeight: 'normal' }}>{selectedReservation.notes}</span></Typography>

                        <Box sx={{ mt: 2, mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#000000' }}>Products Reserved</Typography>
                        </Box>

                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500, color: '#000000' }}>Product Name</TableCell>
                                    <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500, color: '#000000' }}>Quantity</TableCell>
                                    <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500, color: '#000000' }}>Notes</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedReservation.items.map((item, index) => (
                                    <TableRow key={index} sx={{
                                        '&:nth-of-type(odd)': {
                                            backgroundColor: 'background.default',
                                        },
                                        '& td': { py: 1 }
                                    }}>
                                        <TableCell sx={{ color: '#000000' }}>{item.productName || 'N/A'}</TableCell>
                                        <TableCell sx={{ color: '#000000' }}>{item.quantity}</TableCell>
                                        <TableCell sx={{ color: '#000000' }}>{item.notes || 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Drawer>

            <CustomSnackbar
                open={CustomSnackbarOpen}
                message={errorMessage}
                onClose={() => setCustomSnackbarOpen(false)}
            />
        </Container>
    );
}

export default StockList; 