import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Drawer,
  Typography,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Store as VendorIcon,
} from '@mui/icons-material';
import VendorDialog from './VendorDialog';
import VendorDetails from './VendorDetails';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import { vendorService } from '../../services/vendorService';
import CustomSnackbar from '../layout/CustomSnackbar';

function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [CustomSnackbarOpen, setCustomSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getAllVendors();
      setVendors(data);
    } catch (error) {
      const backendMessage = error.response?.data?.message || 'Failed to load vendors. Please try again.';
      setErrorMessage(backendMessage);
      setCustomSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value) => {
    setSearchTerm(value);
    try {
      if (value.trim()) {
        const data = await vendorService.searchVendors(value);
        setVendors(data);
      } else {
        await fetchVendors();
      }
    } catch (error) {
      setError('Failed to search vendors');
    }
  };

  const handleSave = async (vendorData) => {
    try {
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, vendorData);
      } else {
        await vendorService.createVendor(vendorData);
      }
      await fetchVendors();
      setOpenDialog(false);
    } catch (error) {
      const backendMessage = error.response?.data?.message || 'Failed to save vendor. Please try again.';
      setErrorMessage(backendMessage);
      setCustomSnackbarOpen(true);
    
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setOpenDialog(true);
  };

  const handleDelete = async () => {
    if (vendorToDelete) {
      try {
        await vendorService.deleteVendor(vendorToDelete.id);
        setVendors(vendors.filter(vendor => vendor.id !== vendorToDelete.id));
        setConfirmDeleteOpen(false);
        setVendorToDelete(null);
      } catch (error) {
        const backendMessage = error.response?.data?.message || 'Failed to delete vendor. Please try again.';
        setErrorMessage(backendMessage);
        setCustomSnackbarOpen(true);
      }
    }
  };

  const handleDeleteClick = (vendor) => {
    setVendorToDelete(vendor);
    setConfirmDeleteOpen(true);
  };

  const handleRowClick = (vendor) => {
    setSelectedVendor(vendor);
  };

  const handleVendorUpdate = (updatedVendor) => {
    setVendors(vendors.map(v => 
      v.id === updatedVendor.id ? updatedVendor : v
    ));
    setSelectedVendor(updatedVendor);
  };

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Vendor Management
        </Typography>
        
        <Box display={'flex'} gap={2} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
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
              onClick={() => {
                setEditingVendor(null);
                setOpenDialog(true);
              }}
              sx={{ 
                height: '40px',
                background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              Add Vendor
            </Button>
          </Box>
        </Box>
      </Paper>

      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error}</Typography>}

      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Name</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Phone</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Email</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>GSTIN</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Address</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow 
                key={vendor.id}
                onClick={() => handleRowClick(vendor)}
                sx={{
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'background.default',
                  },
                  '& td': { py: 1 },
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                <TableCell><strong>{vendor.name}</strong></TableCell>
                <TableCell>{vendor.phone}</TableCell>
                <TableCell>{vendor.email}</TableCell>
                <TableCell>{vendor.gstin}</TableCell>
                <TableCell>
                  {vendor.address?.city}, {vendor.address?.state}
                </TableCell>
                <TableCell>
                  <IconButton onClick={(e) => { e.stopPropagation(); handleEdit(vendor); }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteClick(vendor); }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {vendors.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No vendors found matching your search
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <VendorDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleSave}
        vendor={editingVendor}
      />

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        vendorName={vendorToDelete?.name}
      />

      <CustomSnackbar
        open={CustomSnackbarOpen}
        message={errorMessage}
        onClose={() => setCustomSnackbarOpen(false)}
      />

      <Drawer
        anchor="right"
        open={Boolean(selectedVendor)}
        onClose={() => setSelectedVendor(null)}
        PaperProps={{
          elevation: 1,
          sx: {
            width: 450,
            backgroundColor: '#ffffff !important',
            boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <VendorDetails 
          vendor={selectedVendor} 
          onClose={() => setSelectedVendor(null)}
          onUpdate={handleVendorUpdate}
        />
      </Drawer>
    </Container>
  );
}

export default VendorList; 