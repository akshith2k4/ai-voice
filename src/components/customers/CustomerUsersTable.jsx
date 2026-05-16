import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { customerUserService } from '../../services/customerUserService';
import CustomerUserDialog from './CustomerUserDialog';

function CustomerUsersTable({ customerId, customerName }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    if (customerId) {
      loadCustomerUsers();
    }
  }, [customerId]);

  const loadCustomerUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await customerUserService.getCustomerUsers(customerId);
      setUsers(response);
    } catch (error) {
      console.error('Error loading customer users:', error);
      setError('Failed to load customer users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await customerUserService.deleteCustomerUser(customerId, userToDelete.id);
      await loadCustomerUsers(); // Refresh the list
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting customer user:', error);
      setError('Failed to delete customer user');
    }
  };

  const handleSaveUser = async (userData, existingUser) => {
    try {
      if (existingUser) {
        // Update existing user
        await customerUserService.updateCustomerUser(customerId, existingUser.id, userData);
      } else {
        // Create new user
        await customerUserService.createCustomerUser(customerId, userData);
      }
      await loadCustomerUsers(); // Refresh the list
    } catch (error) {
      console.error('Error saving customer user:', error);
      throw error;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'MANAGER':
        return 'warning';
      case 'STAFF':
        return 'primary';
      case 'VIEWER':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatRoleName = (role) => {
    return role ? role.charAt(0) + role.slice(1).toLowerCase() : '';
  };

  if (!customerId) {
    return (
      <Alert severity="info">
        Please select a customer to view users
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ color: "#333" }}>
          Customer Users
          {customerName && (
            <Typography variant="body2" sx={{ color: "#666", mt: 0.5 }}>
              {customerName}
            </Typography>
          )}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddUser}
          sx={{
            background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
            boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
            textTransform: "none",
          }}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" sx={{ py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: "primary.lighter", fontWeight: 500 }}>
                  Name
                </TableCell>
                <TableCell sx={{ backgroundColor: "primary.lighter", fontWeight: 500 }}>
                  Email
                </TableCell>
                <TableCell sx={{ backgroundColor: "primary.lighter", fontWeight: 500 }}>
                  Phone
                </TableCell>
                <TableCell sx={{ backgroundColor: "primary.lighter", fontWeight: 500 }}>
                  Role
                </TableCell>
                <TableCell sx={{ backgroundColor: "primary.lighter", fontWeight: 500 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    No users found for this customer
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatRoleName(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user)}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CustomerUserDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
        customerId={customerId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{userToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CustomerUsersTable;
