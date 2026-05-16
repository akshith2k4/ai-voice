import React, { useState } from 'react';
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
  Chip,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';

function AddUserDialog({ open, onClose, onSave }) {
  const initialState = {
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    roles: [],
    status: 'ACTIVE'
  };

  const [formData, setFormData] = useState(initialState);

  const ROLES = [
    'ADMIN',
    'USER',
    'MANAGER',
    'ACCOUNTANT',
    'SUPERVISOR'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    const newUser = {
      ...formData,
      id: Date.now(),
      lastLogin: null,
      createdAt: new Date().toISOString()
    };
    onSave(newUser);
    setFormData(initialState);
  };

  const handleClose = () => {
    setFormData(initialState);
    onClose();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return '#1976d2';
      case 'MANAGER':
        return '#2e7d32';
      case 'SUPERVISOR':
        return '#ed6c02';
      case 'ACCOUNTANT':
        return '#9c27b0';
      default:
        return '#0288d1';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box component="span" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Add New User
        </Box>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Box display={'flex'} spacing={2} sx={{ pt: 1 }}>
          <Box flex={1} item xs={12}>
            <TextField
              name="name"
              label="Full Name"
              fullWidth
              size="small"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Box>

          <Box flex={1} item xs={12}>
            <TextField
              name="email"
              label="Email Address"
              fullWidth
              size="small"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </Box>

          <Box item xs={12}>
            <TextField
              name="password"
              label="Password"
              fullWidth
              size="small"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              helperText="Minimum 8 characters"
            />
          </Box>

          <Box item xs={12}>
            <TextField
              name="phone"
              label="Phone Number"
              fullWidth
              size="small"
              value={formData.phone}
              onChange={handleChange}
            />
          </Box>

          <Box item xs={12}>
            <TextField
              name="department"
              label="Department"
              fullWidth
              size="small"
              value={formData.department}
              onChange={handleChange}
            />
          </Box>

          <Box item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Roles</InputLabel>
              <Select
                name="roles"
                multiple
                value={formData.roles}
                onChange={handleChange}
                label="Roles"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(value),
                          color: 'white',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                )}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Status"
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button 
          onClick={handleClose}
          variant="outlined"
          size="small"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          size="small"
          disabled={!formData.name || !formData.email || !formData.password || formData.roles.length === 0}
          sx={{
            background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
            boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
          }}
        >
          Add User
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddUserDialog; 