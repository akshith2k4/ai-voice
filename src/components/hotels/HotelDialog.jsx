import React, { useState, useEffect } from 'react';
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
  Typography,
  Divider,
  IconButton,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { customerService } from '../../services/customerService';
import { useAgentForm } from '../../agent/useAgentForm';

function HotelDialog({ open, onClose, onSave, hotel }) {
  const [hotelFormData, setHotelFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    pan: '',
    type: 'HOTEL',
    status: 'ACTIVE',
    billingAddress: {
      addressLine1: '',
      addressLine2: '',
      state: '',
      city: '',
      pincode: '',
      country: ''
    },
    shippingAddress: {
      addressLine1: '',
      addressLine2: '',
      state: '',
      city: '',
      pincode: '',
      country: ''
    },
    contactPersons: []
  });

  const [customerTypes, setCustomerTypes] = useState([]);

  useEffect(() => {
    if (hotel) {
      setHotelFormData({
        name: hotel.name || '',
        email: hotel.email || '',
        phone: hotel.phone || '',
        gstin: hotel.gstin || '',
        pan: hotel.pan || '',
        type: hotel.type || 'HOTEL',
        status: hotel.status || 'ACTIVE',
        billingAddress: {
          addressLine1: hotel.billingAddress.addressLine1 || '',
          addressLine2: hotel.billingAddress.addressLine2 || '',
          state: hotel.billingAddress.state || '',
          city: hotel.billingAddress.city || '',
          pincode: hotel.billingAddress.pincode || '',
          country: hotel.billingAddress.country || ''
        },
        shippingAddress: {
          addressLine1: hotel.shippingAddress.addressLine1 || '',
          addressLine2: hotel.shippingAddress.addressLine2 || '',
          state: hotel.shippingAddress.state || '',
          city: hotel.shippingAddress.city || '',
          pincode: hotel.shippingAddress.pincode || '',
          country: hotel.shippingAddress.country || ''
        },
        contactPersons: hotel.contactPersons || []
      });
    } else {
      setHotelFormData({
        name: '',
        email: '',
        phone: '',
        gstin: '',
        pan: '',
        type: 'HOTEL',
        status: 'ACTIVE',
        billingAddress: {
          addressLine1: '',
          addressLine2: '',
          state: '',
          city: '',
          pincode: '',
          country: ''
        },
        shippingAddress: {
          addressLine1: '',
          addressLine2: '',
          state: '',
          city: '',
          pincode: '',
          country: ''
        },
        contactPersons: []
      });
    }
  }, [hotel]);

  useEffect(() => {
    const fetchCustomerTypes = async () => {
      try {
        const types = await customerService.getCustomerTypes();
        setCustomerTypes(types);
      } catch (error) {
        console.error('Error fetching customer types:', error);
      }
    };

    fetchCustomerTypes();
  }, []);

  const handleHotelFormChange = (field, value) => {
    setHotelFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handleAddressChange = (type, field, value) => {
    setHotelFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleContactPersonChange = (index, field, value) => {
    const updatedContactPersons = [...hotelFormData.contactPersons];
    updatedContactPersons[index][field] = value;
    setHotelFormData({ ...hotelFormData, contactPersons: updatedContactPersons });
  };

  const addContactPerson = () => {
    setHotelFormData({
      ...hotelFormData,
      contactPersons: [...hotelFormData.contactPersons, { name: '', phone: '', email: '', tag: '' }]
    });
  };

  const removeContactPerson = (index) => {
    const updatedContactPersons = hotelFormData.contactPersons.filter((_, i) => i !== index);
    setHotelFormData({ ...hotelFormData, contactPersons: updatedContactPersons });
  };

  const resetForm = () => {
    setHotelFormData({
      name: '',
      email: '',
      phone: '',
      gstin: '',
      pan: '',
      type: 'HOTEL',
      status: 'ACTIVE',
      billingAddress: {
        addressLine1: '', addressLine2: '', state: '', city: '', pincode: '', country: ''
      },
      shippingAddress: {
        addressLine1: '', addressLine2: '', state: '', city: '', pincode: '', country: ''
      },
      contactPersons: []
    });
  };

  useAgentForm("createHotel", {
    fields: [
      // Basic Information
      { key: "name", type: "text", set: (v) => handleHotelFormChange("name", v) },
      { key: "phone", type: "text", set: (v) => handleHotelFormChange("phone", v) },
      { key: "email", type: "text", set: (v) => handleHotelFormChange("email", v) },
      { key: "status", type: "select", set: (v) => handleHotelFormChange("status", v) },
      { key: "type", type: "select", set: (v) => handleHotelFormChange("type", v) },
      // Registration
      { key: "gstin", type: "text", set: (v) => handleHotelFormChange("gstin", v) },
      { key: "pan", type: "text", set: (v) => handleHotelFormChange("pan", v) },
      // Billing Address
      { key: "billingAddressLine1", type: "text", set: (v) => handleAddressChange("billingAddress", "addressLine1", v) },
      { key: "billingAddressLine2", type: "text", set: (v) => handleAddressChange("billingAddress", "addressLine2", v) },
      { key: "billingCity", type: "text", set: (v) => handleAddressChange("billingAddress", "city", v) },
      { key: "billingState", type: "text", set: (v) => handleAddressChange("billingAddress", "state", v) },
      { key: "billingPincode", type: "text", set: (v) => handleAddressChange("billingAddress", "pincode", v) },
      { key: "billingCountry", type: "text", set: (v) => handleAddressChange("billingAddress", "country", v) },
      // Shipping Address
      { key: "shippingAddressLine1", type: "text", set: (v) => handleAddressChange("shippingAddress", "addressLine1", v) },
      { key: "shippingAddressLine2", type: "text", set: (v) => handleAddressChange("shippingAddress", "addressLine2", v) },
      { key: "shippingCity", type: "text", set: (v) => handleAddressChange("shippingAddress", "city", v) },
      { key: "shippingState", type: "text", set: (v) => handleAddressChange("shippingAddress", "state", v) },
      { key: "shippingPincode", type: "text", set: (v) => handleAddressChange("shippingAddress", "pincode", v) },
      { key: "shippingCountry", type: "text", set: (v) => handleAddressChange("shippingAddress", "country", v) },
    ],
    subForms: [
      {
        id: "contactPerson",
        add: addContactPerson,
        fields: [
          { key: "contactName", type: "text", setByIndex: (v, idx) => handleContactPersonChange(idx, "name", v) },
          { key: "contactPhone", type: "text", setByIndex: (v, idx) => handleContactPersonChange(idx, "phone", v) },
          { key: "contactEmail", type: "text", setByIndex: (v, idx) => handleContactPersonChange(idx, "email", v) },
          { key: "contactTag", type: "text", setByIndex: (v, idx) => handleContactPersonChange(idx, "tag", v) },
        ],
      },
    ],
    clearAll: resetForm,
  }, open);

  const handleSubmit = () => {
    onSave(hotelFormData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {hotel ? 'Edit Hotel' : 'Add New Hotel'}
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <Grid container spacing={2}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Hotel Name"
                  size="small"
                  value={hotelFormData.name}
                  onChange={(e) => handleHotelFormChange('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  size="small"
                  value={hotelFormData.phone}
                  onChange={(e) => handleHotelFormChange('phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  size="small"
                  type="email"
                  value={hotelFormData.email}
                  onChange={(e) => handleHotelFormChange('email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={hotelFormData.status}
                    label="Status"
                    onChange={(e) => handleHotelFormChange('status', e.target.value)}
                  >
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Customer Type</InputLabel>
                  <Select
                    value={hotelFormData.type}
                    label="Customer Type"
                    onChange={(e) => handleHotelFormChange('type', e.target.value)}
                  >
                    {customerTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>

          {/* Registration Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Registration Information
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GSTIN Number"
                  size="small"
                  value={hotelFormData.gstin}
                  onChange={(e) => handleHotelFormChange('gstin', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="PAN Number"
                  size="small"
                  value={hotelFormData.pan}
                  onChange={(e) => handleHotelFormChange('pan', e.target.value)}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Billing Address */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Billing Address
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  size="small"
                  value={hotelFormData.billingAddress.addressLine1}
                  onChange={(e) => handleAddressChange('billingAddress', 'addressLine1', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 2"
                  size="small"
                  value={hotelFormData.billingAddress.addressLine2}
                  onChange={(e) => handleAddressChange('billingAddress', 'addressLine2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  size="small"
                  value={hotelFormData.billingAddress.city}
                  onChange={(e) => handleAddressChange('billingAddress', 'city', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State"
                  size="small"
                  value={hotelFormData.billingAddress.state}
                  onChange={(e) => handleAddressChange('billingAddress', 'state', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  size="small"
                  value={hotelFormData.billingAddress.pincode}
                  onChange={(e) => handleAddressChange('billingAddress', 'pincode', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  size="small"
                  value={hotelFormData.billingAddress.country}
                  onChange={(e) => handleAddressChange('billingAddress', 'country', e.target.value)}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Shipping Address */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Shipping Address
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  size="small"
                  value={hotelFormData.shippingAddress.addressLine1}
                  onChange={(e) => handleAddressChange('shippingAddress', 'addressLine1', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 2"
                  size="small"
                  value={hotelFormData.shippingAddress.addressLine2}
                  onChange={(e) => handleAddressChange('shippingAddress', 'addressLine2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  size="small"
                  value={hotelFormData.shippingAddress.city}
                  onChange={(e) => handleAddressChange('shippingAddress', 'city', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State"
                  size="small"
                  value={hotelFormData.shippingAddress.state}
                  onChange={(e) => handleAddressChange('shippingAddress', 'state', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  size="small"
                  value={hotelFormData.shippingAddress.pincode}
                  onChange={(e) => handleAddressChange('shippingAddress', 'pincode', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  size="small"
                  value={hotelFormData.shippingAddress.country}
                  onChange={(e) => handleAddressChange('shippingAddress', 'country', e.target.value)}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Contact Persons
            </Typography>
            {hotelFormData.contactPersons.map((contact, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Name"
                  value={contact.name}
                  onChange={(e) => handleContactPersonChange(index, 'name', e.target.value)}
                  sx={{ mr: 1 }}
                />
                <TextField
                  label="Phone"
                  value={contact.phone}
                  onChange={(e) => handleContactPersonChange(index, 'phone', e.target.value)}
                  sx={{ mr: 1 }}
                />
                <TextField
                  label="Email"
                  value={contact.email}
                  onChange={(e) => handleContactPersonChange(index, 'email', e.target.value)}
                  sx={{ mr: 1 }}
                />
                <TextField
                  label="Tag"
                  value={contact.tag}
                  onChange={(e) => handleContactPersonChange(index, 'tag', e.target.value)}
                  sx={{ mr: 1 }}
                />
                <IconButton onClick={() => removeContactPerson(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={addContactPerson}
              sx={{ mb: 2 }}
            >
              Add Contact Person
            </Button>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          sx={{ 
            background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
            boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
          }}
        >
          {hotel ? 'Save Changes' : 'Add Hotel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default HotelDialog; 