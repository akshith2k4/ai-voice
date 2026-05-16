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
  Chip,
  Box,
  OutlinedInput,
} from '@mui/material';

const ROLES = ['ADMIN', 'MANAGER', 'OPERATOR'];

function UserDialog({ open, onClose, onSave, user }) {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    roles: [],
    status: 'ACTIVE',
    password: '' // Only for new users
  });

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        status: user.status,
        password: ''
      });
    } else {
      setUserData({
        name: '',
        email: '',
        phone: '',
        roles: [],
        status: 'ACTIVE',
        password: ''
      });
    }
  }, [user]);

  const handleSubmit = () => {
    onSave(userData);
    setUserData({
      name: '',
      email: '',
      phone: '',
      roles: [],
      status: 'ACTIVE',
      password: ''
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name"
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Phone"
              value={userData.phone}
              onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
            />
          </Grid>
          {!user && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={userData.password}
                onChange={(e) => setUserData({ ...userData, password: e.target.value })}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={userData.roles}
                onChange={(e) => setUserData({ ...userData, roles: e.target.value })}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
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
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={userData.status}
                onChange={(e) => setUserData({ ...userData, status: e.target.value })}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!userData.name || !userData.email || !userData.roles.length || (!user && !userData.password)}
        >
          {user ? 'Save Changes' : 'Add User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UserDialog; 