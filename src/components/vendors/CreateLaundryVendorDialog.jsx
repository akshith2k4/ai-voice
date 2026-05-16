import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';

function CreateLaundryVendorDialog({ open, onClose, onSave, vendor }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
    },
    gstin: '',
    panNumber: '',
    isActive: true,
  });

  useEffect(() => {
    if (vendor) {
      setFormData(vendor);
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          country: '',
          pincode: '',
        },
        gstin: '',
        panNumber: '',
        isActive: true,
      });
    }
  }, [vendor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      address: {
        ...prevData.address,
        [name]: value,
      },
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: checked,
    }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{vendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={0.5}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              value={formData.name}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="phone"
              label="Phone"
              type="text"
              fullWidth
              value={formData.phone}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="email"
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="gstin"
              label="GSTIN"
              type="text"
              fullWidth
              value={formData.gstin}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="panNumber"
              label="PAN Number"
              type="text"
              fullWidth
              value={formData.panNumber}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              name="addressLine1"
              label="Address Line 1"
              type="text"
              fullWidth
              value={formData.address.addressLine1}
              onChange={handleAddressChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              name="addressLine2"
              label="Address Line 2"
              type="text"
              fullWidth
              value={formData.address.addressLine2}
              onChange={handleAddressChange}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              margin="dense"
              name="city"
              label="City"
              type="text"
              fullWidth
              value={formData.address.city}
              onChange={handleAddressChange}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              margin="dense"
              name="state"
              label="State"
              type="text"
              fullWidth
              value={formData.address.state}
              onChange={handleAddressChange}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              margin="dense"
              name="country"
              label="Country"
              type="text"
              fullWidth
              value={formData.address.country}
              onChange={handleAddressChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="pincode"
              label="Pincode"
              type="text"
              fullWidth
              value={formData.address.pincode}
              onChange={handleAddressChange}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                  name="isActive"
                  color="primary"
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateLaundryVendorDialog; 