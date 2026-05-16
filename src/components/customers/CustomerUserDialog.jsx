import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const CUSTOMER_USER_ROLES = [
  'ADMIN',
  'MANAGER',
  'STAFF',
  'VIEWER'
];

function CustomerUserDialog({ open, onClose, onSave, user = null, customerId }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    customerId: customerId || ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Editing existing user
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '', // Don't pre-fill password for security
        role: user.role || '',
        customerId: user.customerId || customerId || ''
      });
    } else {
      // Creating new user
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: '',
        customerId: customerId || ''
      });
    }
    setErrors({});
  }, [user, customerId, open]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = 'Password is required for new users';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData, user);
      onClose();
    } catch (error) {
      console.error('Error saving customer user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: '',
      customerId: customerId || ''
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {user ? 'Edit Customer User' : 'Add Customer User'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {user && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Leave password field empty to keep the current password
            </Alert>
          )}
          
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              size="small"
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              size="small"
            />

            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              error={!!errors.phone}
              helperText={errors.phone}
              size="small"
            />

            <TextField
              fullWidth
              label={user ? "New Password (optional)" : "Password"}
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
              size="small"
            />

            <FormControl fullWidth size="small" error={!!errors.role}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                label="Role"
              >
                {CUSTOMER_USER_ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
              {errors.role && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.role}
                </Typography>
              )}
            </FormControl>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Saving...' : (user ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CustomerUserDialog;
