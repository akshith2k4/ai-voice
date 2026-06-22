import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';

const CHANNEL_TYPES = ['WHATSAPP', 'EMAIL', 'SMS', 'PUSH'];
const ADDRESS_TYPES = [
  { value: 'WHATSAPP_GROUP', label: 'WhatsApp Group' },
  { value: 'WHATSAPP', label: 'WhatsApp Individual' },
  { value: 'SMS', label: 'SMS / Phone' },
  { value: 'EMAIL', label: 'Email Address' },
];

function AddressFormDialog({ open, onClose, onSave, address, errorMessage }) {
  const [formData, setFormData] = useState({
    channelType: '',
    addressType: '',
    addressValue: '',
    active: true,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nextData = { ...prev, [name]: value };
      
      // Auto-helper: map channel type if user changes address type to make it convenient
      if (name === 'addressType') {
        if (value === 'EMAIL') nextData.channelType = 'EMAIL';
        if (value === 'SMS') nextData.channelType = 'SMS';
        if (value === 'WHATSAPP' || value === 'WHATSAPP_GROUP') nextData.channelType = 'WHATSAPP';
      }
      return nextData;
    });
  };

  const handleActiveChange = (e) => {
    setFormData((prev) => ({ ...prev, active: e.target.checked }));
  };

  const handleSubmit = () => {
    if (!formData.channelType || !formData.addressType || !formData.addressValue.trim()) {
      return;
    }
    onSave({
      id: address?.id,
      channelType: formData.channelType,
      addressType: formData.addressType,
      addressValue: formData.addressValue.trim(),
      active: formData.active,
    });
  };

  useEffect(() => {
    if (address) {
      setFormData({
        channelType: address.channelType || '',
        addressType: address.addressType || '',
        addressValue: address.addressValue || '',
        active: address.active ?? true,
      });
    } else {
      setFormData({
        channelType: '',
        addressType: '',
        addressValue: '',
        active: true,
      });
    }
  }, [address, open]);

  const isFormValid = formData.channelType && formData.addressType && formData.addressValue.trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        {address ? 'Edit Address' : 'Add Address'}
      </DialogTitle>
      <DialogContent dividers>
        {errorMessage && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {errorMessage}
          </Typography>
        )}
        <Box display="flex" flexDirection="column" gap={2} sx={{ pt: 1 }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Address Type</InputLabel>
            <Select
              name="addressType"
              value={formData.addressType}
              onChange={handleChange}
              label="Address Type"
            >
              {ADDRESS_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Channel Type</InputLabel>
            <Select
              name="channelType"
              value={formData.channelType}
              onChange={handleChange}
              label="Channel Type"
            >
              {CHANNEL_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Address Value"
            name="addressValue"
            value={formData.addressValue}
            onChange={handleChange}
            variant="outlined"
            size="small"
            placeholder={
              formData.addressType === 'EMAIL' 
                ? 'example@domain.com' 
                : formData.addressType === 'SMS' || formData.addressType === 'WHATSAPP'
                  ? '+919999999999' 
                  : 'Enter value...'
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={handleActiveChange}
                color="success"
              />
            }
            label={
              <Typography variant="body2">
                <strong>Status:</strong> {formData.active ? 'Active' : 'Inactive'}
              </Typography>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!isFormValid}
        >
          {address ? 'Save Changes' : 'Add Address'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddressFormDialog;
