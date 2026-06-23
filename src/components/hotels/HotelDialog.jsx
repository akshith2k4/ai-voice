import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { useCreateHotelAgent } from '../../useagent/useCreateHotelAgent';

function HotelDialog({ open, onClose, onSave, hotel }) {
  const [customerTypes, setCustomerTypes] = useState([]);

  const { control, handleSubmit, reset, setValue, getValues, watch } = useForm({
    defaultValues: {
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
    }
  });

  const { fields: contactPersons, append, remove } = useFieldArray({
    control,
    name: "contactPersons"
  });

  const watchedForm = watch();

  useEffect(() => {
    if (hotel) {
      reset({
        name: hotel.name || '',
        email: hotel.email || '',
        phone: hotel.phone || '',
        gstin: hotel.gstin || '',
        pan: hotel.pan || '',
        type: hotel.type || 'HOTEL',
        status: hotel.status || 'ACTIVE',
        billingAddress: {
          addressLine1: hotel.billingAddress?.addressLine1 || '',
          addressLine2: hotel.billingAddress?.addressLine2 || '',
          state: hotel.billingAddress?.state || '',
          city: hotel.billingAddress?.city || '',
          pincode: hotel.billingAddress?.pincode || '',
          country: hotel.billingAddress?.country || ''
        },
        shippingAddress: {
          addressLine1: hotel.shippingAddress?.addressLine1 || '',
          addressLine2: hotel.shippingAddress?.addressLine2 || '',
          state: hotel.shippingAddress?.state || '',
          city: hotel.shippingAddress?.city || '',
          pincode: hotel.shippingAddress?.pincode || '',
          country: hotel.shippingAddress?.country || ''
        },
        contactPersons: hotel.contactPersons || []
      });
    } else {
      reset({
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
    }
  }, [hotel, reset]);

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

  const resetForm = () => {
    reset({
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

  useCreateHotelAgent({
    open,
    setValue,
    getValues,
    reset: resetForm,
    append,
  });

  const onSubmit = (data) => {
    onSave(data);
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
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Hotel Name"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Contact Phone"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Contact Email"
                      size="small"
                      type="email"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        {...field}
                        label="Status"
                      >
                        <MenuItem value="ACTIVE">Active</MenuItem>
                        <MenuItem value="INACTIVE">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>Customer Type</InputLabel>
                      <Select
                        {...field}
                        label="Customer Type"
                      >
                        {customerTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
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
                <Controller
                  name="gstin"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="GSTIN Number"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="pan"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="PAN Number"
                      size="small"
                    />
                  )}
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
                <Controller
                  name="billingAddress.addressLine1"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Address Line 1"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="billingAddress.addressLine2"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Address Line 2"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="billingAddress.city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="City"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="billingAddress.state"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="State"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="billingAddress.pincode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="ZIP Code"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="billingAddress.country"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Country"
                      size="small"
                    />
                  )}
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
                <Controller
                  name="shippingAddress.addressLine1"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Address Line 1"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="shippingAddress.addressLine2"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Address Line 2"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="shippingAddress.city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="City"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="shippingAddress.state"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="State"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="shippingAddress.pincode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="ZIP Code"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="shippingAddress.country"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Country"
                      size="small"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Contact Persons
            </Typography>
            {contactPersons.map((contact, index) => (
              <Box key={contact.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Controller
                  name={`contactPersons.${index}.name`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Name"
                      sx={{ mr: 1 }}
                    />
                  )}
                />
                <Controller
                  name={`contactPersons.${index}.phone`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone"
                      sx={{ mr: 1 }}
                    />
                  )}
                />
                <Controller
                  name={`contactPersons.${index}.email`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      sx={{ mr: 1 }}
                    />
                  )}
                />
                <Controller
                  name={`contactPersons.${index}.tag`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Tag"
                      sx={{ mr: 1 }}
                    />
                  )}
                />
                <IconButton onClick={() => remove(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() => append({ name: '', phone: '', email: '', tag: '' })}
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
          onClick={handleSubmit(onSubmit)}
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