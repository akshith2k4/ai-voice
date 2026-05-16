import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

function AddPaymentDialog({ open, onClose, onSave, remainingAmount }) {
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date(),
    amount: '',
    paymentMode: '',
    referenceNumber: ''
  });

  const handleSubmit = () => {
    const amount = parseFloat(paymentData.amount);
      onSave({ ...paymentData, amount });
      setPaymentData({
        paymentDate: new Date(),
        amount: '',
        paymentMode: '',
        referenceNumber: ''
      });
    
  };

  const handleAmountChange = (event) => {
    const value = event.target.value;
    setPaymentData(prev => ({ ...prev, amount: value }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Payment</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <DatePicker
              label="Payment Date"
              value={paymentData.paymentDate}
              onChange={(date) => setPaymentData(prev => ({ ...prev, paymentDate: date }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={paymentData.amount}
              onChange={handleAmountChange}
              helperText={`Maximum amount: ₹${remainingAmount.toLocaleString()}`}
              inputProps={{ min: 0, max: remainingAmount, step: '0.01' }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Payment Mode</InputLabel>
              <Select
                value={paymentData.paymentMode}
                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMode: e.target.value }))}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                <MenuItem value="CHEQUE">Cheque</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Reference Number"
              value={paymentData.referenceNumber}
              onChange={(e) => setPaymentData(prev => ({ ...prev, referenceNumber: e.target.value }))}
              helperText="Transaction ID, Cheque number, etc."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!paymentData.amount || !paymentData.paymentMode}
        >
          Add Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddPaymentDialog; 