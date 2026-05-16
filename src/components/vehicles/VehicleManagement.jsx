import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Search as SearchIcon } from '@mui/icons-material';
import { tripService } from '../../services/tripService';

function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [openCreateVehicle, setOpenCreateVehicle] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    type: '',
    vehicleNumber: '',
    capacity: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const branchId = localStorage.getItem('branchId'); // Fetch branch ID from local storage
    if (branchId) {
      fetchVehicles(branchId);
    }
  }, []);

  const fetchVehicles = async (branchId) => {
    try {
      const vehiclesData = await tripService.getVehiclesByBranch(branchId);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

  const handleCreateVehicle = async () => {
    try {
      const branchId = localStorage.getItem('branchId'); // Fetch branch ID from local storage
      const vehicleRequestData = { ...vehicleData, branchId };
      await tripService.addVehicle(vehicleRequestData);
      setOpenCreateVehicle(false);
      fetchVehicles(branchId);
    } catch (error) {
      console.error('Failed to create vehicle:', error);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      const branchId = localStorage.getItem('branchId'); // Fetch branch ID from local storage
      await tripService.removeVehicle(vehicleId);
      fetchVehicles(branchId);
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Vehicle Management
        </Typography>
        <Box display={'flex'} gap={2} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by Vehicle Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ backgroundColor: 'background.paper', borderRadius: 1, maxWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                sx: { height: '40px' },
              }}
            />
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateVehicle(true)}
              sx={{
                height: '40px',
                background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
                textTransform: 'none',
              }}
            >
              Create Vehicle
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Vehicle Type</TableCell>
              <TableCell>Vehicle Number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVehicles.map((vehicle) => (
              <TableRow key={vehicle.id} sx={{ '& td': { py: 1 } }}>
                <TableCell><strong>{vehicle.type}</strong></TableCell>
                <TableCell>{vehicle.vehicleNumber}</TableCell>
                <TableCell>{vehicle.isActive ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>{vehicle.capacity}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                    color="secondary"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openCreateVehicle} onClose={() => setOpenCreateVehicle(false)}>
        <DialogTitle>Create Vehicle</DialogTitle>
        <DialogContent>
          <TextField
            label="Vehicle Type"
            value={vehicleData.type}
            onChange={(e) => setVehicleData({ ...vehicleData, type: e.target.value })}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Vehicle Number"
            value={vehicleData.vehicleNumber}
            onChange={(e) => setVehicleData({ ...vehicleData, vehicleNumber: e.target.value })}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Capacity"
            value={vehicleData.capacity}
            onChange={(e) => setVehicleData({ ...vehicleData, capacity: e.target.value })}
            fullWidth
            margin="dense"
            type="number"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateVehicle(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleCreateVehicle} color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default VehicleManagement;