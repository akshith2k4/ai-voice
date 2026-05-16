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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import CreateLaundryVendorDialog from './CreateLaundryVendorDialog';
import CreateInwardRequestDialog from '../stocks/CreateInwardRequestDialog';
import LaundryVendorDetails from './LaundryVendorDetails';
import { laundryVendorService } from '../../services/laundryVendorService';
import { createInwardRequest } from '../../services/inwardRequestService';
import CustomSnackbar from '../layout/CustomSnackbar';

function LaundryVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedBucketId, setSelectedBucketId] = useState('');
  const [openInwardDialog, setOpenInwardDialog] = useState(false);
  const [CustomSnackbarOpen, setCustomSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const data = await laundryVendorService.getAllVendors();
      setVendors(data);
    } catch (error) {
      const backendMessage = error.response?.data?.message || 'Failed to load vendors. Please try again.';
      setErrorMessage(backendMessage);
      setCustomSnackbarOpen(true);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone.includes(searchTerm)
  );

  const handleAddVendor = () => {
    setEditingVendor(null);
    setOpenDialog(true);
  };

  const handleEditVendor = (vendor, e) => {
    if (e) e.stopPropagation();
    setEditingVendor(vendor);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingVendor(null);
  };

  const handleSaveVendor = async (vendorData) => {
    try {
      if (editingVendor) {
        await laundryVendorService.updateVendor(editingVendor.id, vendorData);
      } else {
        await laundryVendorService.createVendor(vendorData);
      }
      fetchVendors();
      setOpenDialog(false);
    } catch (error) {
      const backendMessage = error.response?.data?.message || 'Failed to save vendor. Please try again.';
      setErrorMessage(backendMessage);
      setCustomSnackbarOpen(true);
    }
  };

  const handleOpenInwardDialog = () => {
    setOpenInwardDialog(true);
  };

  const handleCloseInwardDialog = () => {
    setOpenInwardDialog(false);
  };

  const handleSaveInwardRequest = async (bucketId) => {
    const requestData = {
      bucketId,
    };

    try {
      await createInwardRequest(requestData);
      alert('Inward request created successfully.');
      handleCloseInwardDialog();
    } catch (error) {
      console.error('Error creating inward request:', error);
      alert('Failed to create inward request.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Laundry Vendor Management
        </Typography>
        
        <Box display={'flex'} gap={2} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Search laundry vendors..."
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
              onClick={handleAddVendor}
              sx={{ 
                height: '40px',
                background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              Add Laundry Vendor
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
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
            {filteredVendors.map((vendor) => (
              <TableRow 
                key={vendor.id}
                hover
                onClick={() => setSelectedVendor(vendor)}
                sx={{
                  cursor: 'pointer',
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'background.default',
                  },
                  '& td': { py: 1 }
                }}
              >
                <TableCell><strong>{vendor.name}</strong></TableCell>
                <TableCell>{vendor.email}</TableCell>
                <TableCell>{vendor.phone}</TableCell>
                <TableCell>
                  <Chip
                    label={vendor.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={vendor.isActive ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small"
                    onClick={(e) => handleEditVendor(vendor, e)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add delete functionality if needed
                    }}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredVendors.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  No vendors found matching your search
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
        <LaundryVendorDetails 
          vendor={selectedVendor} 
          onClose={() => setSelectedVendor(null)}
        />
      </Drawer>

      <CreateLaundryVendorDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSave={handleSaveVendor}
        vendor={editingVendor}
      />

      {/* <Button variant="contained" onClick={handleOpenInwardDialog} sx={{ mt: 2 }}>
        Open Inward Request Dialog
      </Button> */}

      <CustomSnackbar
        open={CustomSnackbarOpen}
        message={errorMessage}
        onClose={() => setCustomSnackbarOpen(false)}
      />

      <CreateInwardRequestDialog
        open={openInwardDialog}
        onClose={handleCloseInwardDialog}
        onSave={handleSaveInwardRequest}
        bucketId={selectedBucketId}
        buckets={buckets}
      />
    </Container>
  );
}

export default LaundryVendorsPage; 