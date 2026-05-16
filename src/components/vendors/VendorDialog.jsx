import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid
} from '@mui/material';

function VendorDialog({ open, onClose, onSave, vendor }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    panNumber: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: ''
    }
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        gstin: vendor.gstin || '',
        panNumber: vendor.panNumber || '',
        address: vendor.address || {
          addressLine1: vendor.address?.addressLine1 || '',
          addressLine2: vendor.address?.addressLine2 || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          pincode: vendor.address?.pincode || '',
          country: vendor.address?.country || ''
        }
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        gstin: '',
        panNumber: '',
        address: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          pincode: '',
          country: ''
        }
      });
    }
  }, [vendor]);

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{vendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="GSTIN"
              name="gstin"
              value={formData.gstin}
              onChange={(e) => handleChange('gstin', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="PAN Number"
              name="panNumber"
              value={formData.panNumber}
              onChange={(e) => handleChange('panNumber', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address Line 1"
              name="address.addressLine1"
              value={formData.address.addressLine1}
              onChange={(e) => handleChange('address.addressLine1', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address Line 2"
              name="address.addressLine2"
              value={formData.address.addressLine2}
              onChange={(e) => handleChange('address.addressLine2', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              name="address.city"
              value={formData.address.city}
              onChange={(e) => handleChange('address.city', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="State"
              name="address.state"
              value={formData.address.state}
              onChange={(e) => handleChange('address.state', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Pincode"
              name="address.pincode"
              value={formData.address.pincode}
              onChange={(e) => handleChange('address.pincode', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country"
              name="address.country"
              value={formData.address.country}
              onChange={(e) => handleChange('address.country', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {vendor ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VendorDialog; 