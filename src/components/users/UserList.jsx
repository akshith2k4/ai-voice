import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Drawer,
  IconButton,
  Button,
  Toolbar,
  Typography,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import UserDetails from './UserDetails';
import UserFormDialog from './UserFormDialog';
import { laundryUserService } from '../../services/laundryUserService';
import CustomSnackbar from '../layout/CustomSnackbar';

function UserList() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const branchId = localStorage.getItem('branchId');
      const data = await laundryUserService.getUsersByBranch(branchId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRowClick = (user) => {
    setSelectedUser(user);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setOpenDialog(true);
  };

  const handleEditUser = (user, e) => {
    if (e) e.stopPropagation();
    setEditingUser({ ...user, password: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setErrorMessage('');
  };

  const handleDeleteUser = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await laundryUserService.deleteUser(id);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      if (userData.id) {
        await laundryUserService.updateUser(userData.id, userData);
      } else {
        await laundryUserService.createUser(userData);
      }
      loadUsers();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving user:', error);
      const backendMessage = error.response?.data?.message || 'Failed to save user. Please try again.';
      setErrorMessage(backendMessage);
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          User Management
        </Typography>

        <Box display={'flex'} gap={2} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ backgroundColor: 'background.paper', borderRadius: 1, maxWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                sx: { height: '40px' }
              }}
            />
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddUser}
              sx={{ 
                height: '40px',
                background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
                textTransform: 'none',
                zIndex: 2,
                width: '150px',
              }}
            >
              Add User
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Name</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Email</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Role</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Status</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow 
                key={user.id}
                hover
                onClick={() => handleRowClick(user)}
                sx={{
                  cursor: 'pointer',
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'background.default',
                  },
                  '& td': { py: 1 }
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon 
                      sx={{ 
                        mr: 1, 
                        color: 'primary.main',
                        fontSize: '1.2rem'
                      }} 
                    />
                    <strong>{user.name}</strong>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    size="small"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    size="small"
                    color={user.status === 'ACTIVE' ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small"
                    onClick={(e) => handleEditUser(user, e)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={(e) => handleDeleteUser(user.id, e)}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  No users found matching your search
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Drawer
        anchor="right"
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        PaperProps={{
          elevation: 1,
          sx: {
            width: 450,
            backgroundColor: '#ffffff !important',
            boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <UserDetails 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)}
        />
      </Drawer>

      <UserFormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSave={handleSaveUser}
        user={editingUser}
      />
      <CustomSnackbar
        open={snackbarOpen}
        message={errorMessage}
        onClose={handleSnackbarClose}
      />
    </Container>
  );
}

export default UserList;