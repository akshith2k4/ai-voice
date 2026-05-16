import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formatCustomDate } from '../../utils/dateUtils';

function CreateInvoiceDialog({ open, onClose, onSave }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [hotelDetails, setHotelDetails] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);

  // Mock function to fetch hotel details
  const handleSearchHotel = () => {
    // Simulate API call
    setHotelDetails({
      id: 1,
      hotelName: "Grand Hotel",
      phone: "9876543210",
      address: "123 Main Street, City"
    });

    // Simulate fetching orders
    setOrders([
      {
        id: 1,
        orderId: "ORD001",
        orderDate: "2024-01-15",
        products: [
          { name: "Bed Sheet Washing", quantity: 100, rate: 150, amount: 15000 },
          { name: "Towel Washing", quantity: 50, rate: 200, amount: 10000 }
        ],
        total: 25000
      }
    ]);
  };

  const handleToggleOrder = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  const handleSubmit = () => {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id));
    const totalAmount = selectedOrdersData.reduce((sum, order) => sum + order.total, 0);

    onSave({
      hotelId: hotelDetails.id,
      hotelName: hotelDetails.hotelName,
      startDate: dateRange.startDate.toISOString().split('T')[0],
      endDate: dateRange.endDate.toISOString().split('T')[0],
      totalAmount,
      items: selectedOrdersData
    });

    // Reset form
    setPhoneNumber('');
    setDateRange({ startDate: null, endDate: null });
    setHotelDetails(null);
    setOrders([]);
    setSelectedOrders([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generate New Invoice</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Hotel Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button 
              fullWidth 
              variant="contained"
              onClick={handleSearchHotel}
              disabled={!phoneNumber}
            >
              Search Hotel
            </Button>
          </Grid>

          {hotelDetails && (
            <>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Hotel Details</Typography>
                  <Typography>{hotelDetails.hotelName}</Typography>
                  <Typography color="textSecondary">{hotelDetails.address}</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox 
                            checked={selectedOrders.length === orders.length}
                            indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.length}
                            onChange={() => {
                              if (selectedOrders.length === orders.length) {
                                setSelectedOrders([]);
                              } else {
                                setSelectedOrders(orders.map(order => order.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell padding="checkbox">
                            <Checkbox 
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleToggleOrder(order.id)}
                            />
                          </TableCell>
                          <TableCell>{order.orderId}</TableCell>
                          <TableCell>{formatCustomDate(order.orderDate)}</TableCell>
                          <TableCell>
                            {order.products.map(product => 
                              `${product.name} (${product.quantity})`
                            ).join(', ')}
                          </TableCell>
                          <TableCell align="right">₹{order.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6">
                    Total Amount: ₹{orders
                      .filter(order => selectedOrders.includes(order.id))
                      .reduce((sum, order) => sum + order.total, 0)
                      .toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!hotelDetails || selectedOrders.length === 0 || !dateRange.startDate || !dateRange.endDate}
        >
          Generate Invoice
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateInvoiceDialog; 