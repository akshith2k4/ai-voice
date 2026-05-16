import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { laundryUserService } from '../../services/laundryUserService';

function UserFormDialog({ open, onClose, onSave, user, errorMessage }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (user) {
      setFormData({ ...user, password: '' });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: '',
        status: 'ACTIVE',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      return; // Prevent submission if required fields are missing
    }

    const userData = {
      id: user?.id,
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      role: formData.role,
      branchId: localStorage.getItem('branchId') || '',
      isActive: formData.status === 'ACTIVE',
    };

    try {
      onSave(userData); // Ensure this is only called once
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{user ? 'Edit User' : 'Add User'}</DialogTitle>
      <DialogContent>
        {errorMessage && (
          <Typography color="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Typography>
        )}
        <Box spacing={0}>
          <Box item xs={12}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              variant="outlined"
              margin="dense"
            />
          </Box>
          <Box item xs={12}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              margin="dense"
              autoComplete="new-email"
            />
          </Box>
          <Box item xs={12}>
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="text"
              value={formData.password}
              onChange={handleChange}
              variant="outlined"
              margin="dense"
              autoComplete="new-password"
            />
          </Box>
          <Box item xs={12}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              variant="outlined"
              margin="dense"
            />
          </Box>
          <Box item xs={12}>
            <FormControl fullWidth variant="outlined" margin="dense">
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Role"
              >
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="USER">User</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box item xs={12}>
            <FormControl fullWidth variant="outlined" margin="dense">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!formData.name || !formData.email || !formData.role}>
          {user ? 'Save Changes' : 'Add User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UserFormDialog; 