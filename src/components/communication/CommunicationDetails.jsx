import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  ContactMail as ContactIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Chat as SmsIcon,
  Smartphone as PushIcon,
  VpnKey as KeyIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import CustomDrawer from '../common/CustomDrawer';
import { communicationService } from '../../services/communicationService';
import CommunicationUserFormDialog from './CommunicationUserFormDialog';
import AddressFormDialog from './AddressFormDialog';

function CommunicationDetails({ open, user, onClose, onToggleActive, onReloadUser, onRefreshList, showSnackbar }) {
  const [openUserForm, setOpenUserForm] = useState(false);
  const [userFormError, setUserFormError] = useState('');
  const [openAddressForm, setOpenAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressFormError, setAddressFormError] = useState('');

  if (!user) return null;

  const handleEditUser = () => {
    setUserFormError('');
    setOpenUserForm(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this communication user? This will also delete all their registered channel addresses.')) {
      try {
        await communicationService.deleteCommunicationUser(userId);
        showSnackbar('Communication user deleted successfully.', 'success');
        onClose();
        onRefreshList();
      } catch (error) {
        console.error('Failed to delete communication user:', error);
        showSnackbar('Failed to delete communication user.', 'error');
      }
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      await communicationService.updateCommunicationUser(user.id, userData);
      setOpenUserForm(false);
      onReloadUser();
      onRefreshList();
      showSnackbar('Communication user updated successfully.', 'success');
    } catch (error) {
      console.error('Failed to update communication user:', error);
      const backendMessage = error.response?.data?.message || 'Failed to save user.';
      setUserFormError(backendMessage);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressFormError('');
    setOpenAddressForm(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressFormError('');
    setOpenAddressForm(true);
  };

  const handleSaveAddress = async (addressData) => {
    try {
      if (addressData.id) {
        await communicationService.updateAddress(addressData.id, addressData);
        showSnackbar('Address updated successfully.', 'success');
      } else {
        await communicationService.addAddress(user.id, addressData);
        showSnackbar('Address added successfully.', 'success');
      }
      setOpenAddressForm(false);
      setEditingAddress(null);
      onReloadUser();
    } catch (error) {
      console.error('Failed to save address:', error);
      const backendMessage = error.response?.data?.message || 'Failed to save address.';
      setAddressFormError(backendMessage);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await communicationService.deleteAddress(addressId);
        showSnackbar('Address deleted successfully.', 'success');
        onReloadUser();
      } catch (error) {
        console.error('Failed to delete address:', error);
        showSnackbar('Failed to delete address.', 'error');
      }
    }
  };

  const getChannelIcon = (channelType) => {
    switch (channelType) {
      case 'WHATSAPP':
        return <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />;
      case 'EMAIL':
        return <EmailIcon fontSize="small" sx={{ color: '#ea4335' }} />;
      case 'SMS':
        return <SmsIcon fontSize="small" sx={{ color: '#007aff' }} />;
      case 'PUSH':
        return <PushIcon fontSize="small" sx={{ color: '#ff9500' }} />;
      default:
        return <ContactIcon fontSize="small" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'primary';
      case 'MANAGER':
        return 'info';
      case 'CUSTOMER':
        return 'success';
      case 'IMPLEMENTATION_ENGINEER':
      case 'SOFTWARE_ENGINEER':
        return 'warning';
      default:
        return 'default';
    }
  };

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

  return (
    <CustomDrawer open={open} onClose={onClose} width={600}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
      <Box sx={{ 
        p: 2,
        px: 3, 
        borderBottom: 1, 
        borderColor: '#e0e0e0',
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#1a1a1a'
          }}
        >
          Communication User Details
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{
            color: '#757575',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: '#ffffff', px: 3, py: 2 }}>
        <List disablePadding>
          <ListItem sx={{ px: 0 }}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between', width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, color: '#2e7d32' }} />
                    <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                      Overview
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={handleEditUser}
                      sx={{ textTransform: 'none' }}
                    >
                      Edit User
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteUser(user.id)}
                      color="error"
                      sx={{ textTransform: 'none' }}
                    >
                      Delete User
                    </Button>
                  </Box>
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Name:</strong> {user.userName || 'Unnamed'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>User Type:</strong>{' '}
                      <Chip
                        label={getTypeLabel(user.userType)}
                        size="small"
                        color="secondary"
                        sx={{ ml: 1, fontWeight: 500 }}
                      />
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <KeyIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Reference ID:</strong> {user.userReferenceId}
                    </Typography>
                  </Box>

                  {user.userRole && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ContactIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.primary">
                        <strong>Role:</strong>{' '}
                        <Chip
                          label={user.userRole}
                          size="small"
                          color={getRoleColor(user.userRole)}
                          sx={{ ml: 1, fontWeight: 500 }}
                        />
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.active ?? false}
                          onChange={(e) => onToggleActive(user.id, e.target.checked)}
                          color="success"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          <strong>Receive Messages (On/Off):</strong>{' '}
                          <Typography
                            component="span"
                            variant="body2"
                            color={user.active ? 'success.main' : 'error.main'}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {user.active ? 'ON' : 'OFF'}
                          </Typography>
                        </Typography>
                      }
                    />
                  </Box>
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
              <ContactIcon sx={{ mr: 1 }} /> Channel Addresses
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddAddress}
              sx={{ textTransform: 'none' }}
            >
              Add Address
            </Button>
          </Box>

          {user.addresses && user.addresses.length > 0 ? (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Channel</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Address Value</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', py: 1 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {user.addresses.map((addr) => (
                    <TableRow key={addr.id} hover>
                      <TableCell sx={{ py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getChannelIcon(addr.channelType)}
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            {addr.channelType}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1, wordBreak: 'break-all' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                          {addr.addressValue}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={addr.active ? 'Active' : 'Inactive'}
                          size="small"
                          color={addr.active ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }} align="right">
                        <IconButton size="small" onClick={() => handleEditAddress(addr)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteAddress(addr.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
              No communication addresses registered.
            </Typography>
          )}
        </List>
      </Box>
    </Box>

    <CommunicationUserFormDialog
      open={openUserForm}
      onClose={() => setOpenUserForm(false)}
      onSave={handleSaveUser}
      user={user}
      errorMessage={userFormError}
    />

    <AddressFormDialog
      open={openAddressForm}
      onClose={() => setOpenAddressForm(false)}
      onSave={handleSaveAddress}
      address={editingAddress}
      errorMessage={addressFormError}
    />
  </CustomDrawer>
  );
}

export default CommunicationDetails;
