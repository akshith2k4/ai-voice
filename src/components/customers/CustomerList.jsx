import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Box,
  Chip,
  useTheme,
  AppBar,
  Toolbar,
  InputAdornment,
  Drawer,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import { customerService } from '../../services/customerService'; // Assume you have a customerService
import CustomerDetails from './CustomerDetails'; // Import the sidebar component

function CustomerList() {
  const theme = useTheme();
  const emptyCustomer = {
    id: null,
    name: '',
    email: '',
    phone: '',
    isActive: true,
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  };

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(emptyCustomer);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getAllCustomers();
      setCustomers(data.content); // Assuming paginated response
    } catch (error) {
      console.error('Error loading customers:', error);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value) => {
    setSearchTerm(value);
    try {
      if (value.trim()) {
        const data = await customerService.searchCustomers(value);
        setCustomers(data.content); // Assuming paginated response
      } else {
        loadCustomers();
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const handleRowClick = (customer) => {
    setSelectedCustomer(customer);
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Customers
      </Typography>
      <TextField
        label="Search"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id} onClick={() => handleRowClick(customer)}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  <Chip
                    label={customer.isActive ? 'ACTIVE' : 'INACTIVE'}
                    size="small"
                    color={customer.isActive ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </Container>
  );
}

export default CustomerList; 