import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Typography,
  Switch,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { communicationService } from '../../services/communicationService';
import CommunicationDetails from './CommunicationDetails';
import CommunicationUserFormDialog from './CommunicationUserFormDialog';
import CustomSnackbar from '../layout/CustomSnackbar';
import DataTable from '../common/tables/DataTable';

function CommunicationList() {
  // ==========================================
  // 1. State Declarations
  // ==========================================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'team_user', 'customer', 'customer_user'
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarType, setSnackbarType] = useState('error'); // 'error' or 'success'
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [userFormError, setUserFormError] = useState('');

  // ==========================================
  // 2. Handlers & Helpers
  // ==========================================
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await communicationService.getCommunicationUsers(activeTab);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading communication users:', error);
      showSnackbar('Failed to load communication users.', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const handleToggleActive = async (id, newActiveVal) => {
    try {
      const updatedUser = await communicationService.updateActiveStatus(id, newActiveVal);
      
      // Update local state list
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === id ? { ...u, active: updatedUser.active } : u))
      );

      // If this user is currently open in details, update the drawer user too
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser((prev) => ({ ...prev, active: updatedUser.active }));
      }

      showSnackbar(`Communication turned ${newActiveVal ? 'ON' : 'OFF'} for ${updatedUser.userName || 'user'}.`, 'success');
    } catch (error) {
      console.error('Error updating active status:', error);
      showSnackbar('Failed to update communication status.', 'error');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const loadUserDetails = useCallback(async (userId) => {
    try {
      const detailedUser = await communicationService.getCommunicationUserById(userId);
      const addresses = await communicationService.getAddressesByUserId(userId);
      setSelectedUser({ ...detailedUser, addresses });
    } catch (error) {
      console.error('Error reloading communication user details:', error);
    }
  }, []);

  const handleRowClick = async (user) => {
    try {
      await loadUserDetails(user.id);
    } catch (error) {
      console.error('Error loading communication user details:', error);
      showSnackbar('Failed to load user details.', 'error');
    }
  };

  const showSnackbar = (message, type = 'error') => {
    setErrorMessage(message);
    setSnackbarType(type);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleAddUser = () => {
    setUserFormError('');
    setOpenUserDialog(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      await communicationService.createCommunicationUser(userData);
      setOpenUserDialog(false);
      loadUsers();
      showSnackbar('Communication user added successfully.', 'success');
    } catch (error) {
      console.error('Failed to create communication user:', error);
      const backendMessage = error.response?.data?.message || 'Failed to save user.';
      setUserFormError(backendMessage);
    }
  };

  // Client-side text filter on username or reference ID
  const filteredUsers = users.filter((user) => {
    const nameMatch = (user.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const refIdMatch = String(user.userReferenceId || '').includes(searchTerm);
    return nameMatch || refIdMatch;
  });

  const getTypeLabel = (type) => {
    switch (type) {
      case 'TEAM_USER':
        return 'Team User';
      case 'CUSTOMER':
        return 'Customer';
      case 'CUSTOMER_USER':
        return 'Customer User';
      default:
        return type;
    }
  };

  // DataTable Column Definitions
  const columns = [
    {
      field: 'userName',
      headerName: 'Name',
      type: 'mediumText',
      isPrimary: true,
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.2rem' }} />
          <strong>{value || 'Unnamed'}</strong>
        </Box>
      ),
    },
    {
      field: 'userReferenceId',
      headerName: 'Reference ID',
      type: 'number',
      isPrimary: true,
    },
    {
      field: 'userType',
      headerName: 'Type',
      type: 'smallText',
      isPrimary: true,
      render: (value) => {
        let chipColor = "default";
        if (value === 'TEAM_USER') chipColor = "primary";
        else if (value === 'CUSTOMER') chipColor = "warning";
        else if (value === 'CUSTOMER_USER') chipColor = "success";

        return (
          <Chip
            label={getTypeLabel(value)}
            size="small"
            color={chipColor}
            variant="outlined"
            sx={{ fontSize: '0.78rem', fontWeight: 500 }}
          />
        );
      },
    },
    {
      field: 'userRole',
      headerName: 'Role',
      type: 'smallText',
      isPrimary: true,
      render: (value) => value || '-',
    },
    {
      field: 'active',
      headerName: 'Communication (On/Off)',
      type: 'mediumText',
      isPrimary: true,
      stopPropagation: true, // Prevents row click selection on toggle
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Switch
            checked={value ?? false}
            onChange={(e) => handleToggleActive(row.id, e.target.checked)}
            color="success"
            size="small"
          />
          <Typography
            variant="caption"
            color={value ? 'success.main' : 'text.secondary'}
            sx={{ fontWeight: 'bold' }}
          >
            {value ? 'ON' : 'OFF'}
          </Typography>
        </Box>
      ),
    },
  ];

  // ==========================================
  // 3. Effects
  // ==========================================
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Communication Management
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ width: '100%' }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="Search by name or ref ID..."
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ backgroundColor: 'background.paper', borderRadius: 1, minWidth: 260 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                sx: { height: '38px' }
              }}
            />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                sx={{ height: '38px', backgroundColor: 'background.paper' }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="team_user">Team Users</MenuItem>
                <MenuItem value="customer">Customers</MenuItem>
                <MenuItem value="customer_user">Customer Users</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddUser}
              sx={{
                height: '38px',
                textTransform: 'none',
                background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
              }}
            >
              Add User
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={loadUsers}
              disabled={loading}
              sx={{ height: '38px', textTransform: 'none' }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredUsers}
          onRowClick={handleRowClick}
          rowKey="id"
          selectedId={selectedUser?.id}
        />
      )}

      <CommunicationDetails
        open={Boolean(selectedUser)}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onToggleActive={handleToggleActive}
        onReloadUser={() => selectedUser && loadUserDetails(selectedUser.id)}
        onRefreshList={loadUsers}
        showSnackbar={showSnackbar}
      />

      <CommunicationUserFormDialog
        open={openUserDialog}
        onClose={() => setOpenUserDialog(false)}
        onSave={handleSaveUser}
        errorMessage={userFormError}
      />

      <CustomSnackbar
        open={snackbarOpen}
        message={errorMessage}
        severity={snackbarType} // Passes success/error style
        onClose={handleSnackbarClose}
      />
    </Container>
  );
}

export default CommunicationList;
