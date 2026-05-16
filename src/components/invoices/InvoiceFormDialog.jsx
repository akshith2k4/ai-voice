import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid } from '@mui/material';

function InvoiceFormDialog({ open, onClose, onSave, invoice }) {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    date: '',
    amount: '',
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber || '',
        date: invoice.date || '',
        amount: invoice.amount || '',
      });
    } else {
      setFormData({
        invoiceNumber: '',
        date: '',
        amount: '',
      });
    }
  }, [invoice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{invoice ? 'Edit Invoice' : 'Add Invoice'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Invoice Number"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleChange}
              variant="outlined"
              margin="dense"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              variant="outlined"
              margin="dense"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              variant="outlined"
              margin="dense"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!formData.invoiceNumber || !formData.date || !formData.amount}>
          {invoice ? 'Save Changes' : 'Add Invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default InvoiceFormDialog; 