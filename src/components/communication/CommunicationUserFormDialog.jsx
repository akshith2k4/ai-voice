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
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { laundryUserService } from '../../services/laundryUserService';
import { customerService } from '../../services/customerService';
import { customerUserService } from '../../services/customerUserService';
import { hotelService } from '../../services/hotelService';
import { vendorService } from '../../services/vendorService';

const USER_TYPES = [
  { value: 'TEAM_USER', label: 'Team User' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'CUSTOMER_USER', label: 'Customer User' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'LAUNDRY', label: 'Laundry Vendor' },
];

const ROLE_TYPES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'HOUSEKEEPER', label: 'Housekeeper' },
  { value: 'GUEST', label: 'Guest' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'IMPLEMENTATION_ENGINEER', label: 'Implementation Engineer' },
  { value: 'SOFTWARE_ENGINEER', label: 'Software Engineer' },
];

function CommunicationUserFormDialog({ open, onClose, onSave, user, errorMessage }) {
  const [formData, setFormData] = useState({
    userType: '',
    userReferenceId: '',
    userName: '',
    userRole: '',
    active: true,
  });

  // Autocomplete option lists
  const [referencesList, setReferencesList] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [selectedRef, setSelectedRef] = useState(null);

  // For CUSTOMER_USER flow: first select customer, then load customer users
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customersList, setCustomersList] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutocompleteChange = (newValue) => {
    setSelectedRef(newValue);
    if (newValue) {
      setFormData((prev) => {
        const update = {
          ...prev,
          userReferenceId: newValue.id,
          userName: prev.userName || newValue.name, // Auto-populate name if empty
        };
        // Auto-assign default roles to be helpful
        if (!prev.userRole) {
          if (prev.userType === 'TEAM_USER') {
            const role = newValue.original?.role;
            if (role === 'ADMIN') update.userRole = 'ADMIN';
            else update.userRole = 'MANAGER';
          } else if (prev.userType === 'CUSTOMER' || prev.userType === 'CUSTOMER_USER') {
            update.userRole = 'CUSTOMER';
          } else if (prev.userType === 'HOTEL') {
            update.userRole = 'HOTEL';
          }
        }
        return update;
      });
    } else {
      setFormData((prev) => ({ ...prev, userReferenceId: '', userName: '' }));
    }
  };

  const handleActiveChange = (e) => {
    setFormData((prev) => ({ ...prev, active: e.target.checked }));
  };

  const handleSubmit = () => {
    if (!formData.userType || !formData.userReferenceId || !formData.userName.trim() || !formData.userRole) {
      return;
    }
    onSave({
      id: user?.id,
      userType: formData.userType,
      userReferenceId: Number(formData.userReferenceId),
      userName: formData.userName.trim(),
      userRole: formData.userRole,
      active: formData.active,
    });
  };

  useEffect(() => {
    if (user) {
      setFormData({
        userType: user.userType || '',
        userReferenceId: user.userReferenceId || '',
        userName: user.userName || '',
        userRole: user.userRole || '',
        active: user.active ?? true,
      });
      setSelectedRef(null);
      setSelectedCustomer(null);
    } else {
      setFormData({
        userType: '',
        userReferenceId: '',
        userName: '',
        userRole: '',
        active: true,
      });
      setSelectedRef(null);
      setSelectedCustomer(null);
      setReferencesList([]);
    }
  }, [user, open]);

  // Load reference list dynamically when userType changes (only on creation)
  useEffect(() => {
    if (user || !formData.userType || !open) return;

    const loadReferences = async () => {
      setLoadingReferences(true);
      setReferencesList([]);
      setSelectedRef(null);
      setSelectedCustomer(null);

      try {
        let list = [];
        if (formData.userType === 'TEAM_USER') {
          const res = await laundryUserService.getAllUsers();
          list = Array.isArray(res) ? res : [];
        } else if (formData.userType === 'CUSTOMER') {
          const res = await customerService.getAllCustomers();
          list = Array.isArray(res) ? res : (res?.content || []);
        } else if (formData.userType === 'CUSTOMER_USER') {
          // In customer user case, we load customers list first
          setLoadingCustomers(true);
          const res = await customerService.getAllCustomers();
          setCustomersList(Array.isArray(res) ? res : (res?.content || []));
          setLoadingCustomers(false);
        } else if (formData.userType === 'HOTEL') {
          const res = await hotelService.getAllHotels();
          list = Array.isArray(res) ? res : [];
        } else if (formData.userType === 'LAUNDRY') {
          const res = await vendorService.getAllVendors();
          list = Array.isArray(res) ? res : [];
        }
        
        // Format list consistently with name and id properties
        const formatted = list.map((item) => ({
          id: item.id,
          name: item.name || item.userName || `ID: ${item.id}`,
          original: item,
        }));
        setReferencesList(formatted);
      } catch (error) {
        console.error('Failed to load reference items:', error);
      } finally {
        setLoadingReferences(false);
      }
    };

    loadReferences();
  }, [formData.userType, user, open]);

  // For CUSTOMER_USER: fetch customer users when selectedCustomer changes
  useEffect(() => {
    if (!selectedCustomer || formData.userType !== 'CUSTOMER_USER') return;

    const loadCustomerUsers = async () => {
      setLoadingReferences(true);
      setReferencesList([]);
      setSelectedRef(null);
      try {
        const res = await customerUserService.getCustomerUsers(selectedCustomer.id);
        const list = Array.isArray(res) ? res : [];
        const formatted = list.map((item) => ({
          id: item.id,
          name: item.name || `ID: ${item.id}`,
          original: item,
        }));
        setReferencesList(formatted);
      } catch (error) {
        console.error('Failed to load customer users:', error);
      } finally {
        setLoadingReferences(false);
      }
    };

    loadCustomerUsers();
  }, [selectedCustomer, formData.userType]);

  const isFormValid =
    formData.userType &&
    formData.userReferenceId &&
    formData.userName.trim() &&
    formData.userRole;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        {user ? 'Edit Communication User' : 'Add Communication User'}
      </DialogTitle>
      <DialogContent dividers>
        {errorMessage && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {errorMessage}
          </Typography>
        )}
        <Box display="flex" flexDirection="column" gap={2} sx={{ pt: 1 }}>
          {/* User Type Selection (Disabled on edit) */}
          <FormControl fullWidth variant="outlined" size="small" disabled={Boolean(user)}>
            <InputLabel>User Type</InputLabel>
            <Select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              label="User Type"
            >
              {USER_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Autocomplete Selectors (Only on creation) */}
          {!user && formData.userType === 'CUSTOMER_USER' && (
            <Autocomplete
              fullWidth
              size="small"
              options={customersList}
              getOptionLabel={(option) => option.name || `ID: ${option.id}`}
              value={selectedCustomer}
              onChange={(e, nv) => {
                setSelectedCustomer(nv);
                setReferencesList([]);
                setSelectedRef(null);
              }}
              loading={loadingCustomers}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customer"
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          )}

          {!user && formData.userType && (
            <Autocomplete
              fullWidth
              size="small"
              options={referencesList}
              getOptionLabel={(option) => option.name || ''}
              value={selectedRef}
              onChange={(e, nv) => handleAutocompleteChange(nv)}
              loading={loadingReferences}
              disabled={formData.userType === 'CUSTOMER_USER' && !selectedCustomer}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`Select ${USER_TYPES.find((t) => t.value === formData.userType)?.label || 'Reference'}`}
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingReferences ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          )}

          {/* Reference ID - Manual Fallback / Read-only in Edit */}
          <TextField
            fullWidth
            label="Reference ID"
            name="userReferenceId"
            type="number"
            value={formData.userReferenceId}
            onChange={handleChange}
            disabled={Boolean(user) || Boolean(selectedRef)}
            variant="outlined"
            size="small"
            required
            helperText={!user && !selectedRef ? "Select a reference above or enter manually" : ""}
          />

          {/* Name Field (Can edit anytime) */}
          <TextField
            fullWidth
            label="Name"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            variant="outlined"
            size="small"
            required
          />

          {/* Role Selection */}
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Role</InputLabel>
            <Select
              name="userRole"
              value={formData.userRole}
              onChange={handleChange}
              label="Role"
            >
              {ROLE_TYPES.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Active Switch */}
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
          {user ? 'Save Changes' : 'Add User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CommunicationUserFormDialog;
