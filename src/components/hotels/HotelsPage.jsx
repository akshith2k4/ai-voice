import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import CustomerFormDialog from '../customers/CustomerFormDialog';
import { Button, Container } from '@mui/material';

function HotelsPage() {
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const data = await customerService.getCustomers();
        setHotels(data); // Set the hotels state with the customer data
      } catch (error) {
        console.error('Error fetching hotels:', error);
      }
    };

    fetchHotels();
  }, []);

  const handleEditHotel = (hotel) => {
    setSelectedHotel(hotel);
    setOpenDialog(true);
  };

  const handleAddHotel = () => {
    setSelectedHotel(null);
    setOpenDialog(true);
  };

  const handleSaveHotel = async (hotelData) => {
    try {
      if (selectedHotel) {
        const updatedHotel = await customerService.updateCustomer(selectedHotel.id, hotelData);
        setHotels((prev) => prev.map((h) => (h.id === updatedHotel.id ? updatedHotel : h)));
      } else {
        const newHotel = await customerService.createCustomer(hotelData);
        setHotels((prev) => [...prev, newHotel]);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving hotel:', error);
    }
  };

  const handleDeleteHotel = async (id) => {
    try {
      await customerService.deleteCustomer(id);
      setHotels((prev) => prev.filter((h) => h.id !== id));
    } catch (error) {
      console.error('Error deleting hotel:', error);
    }
  };

  return (
    <Container>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Button variant="contained" onClick={handleAddHotel} sx={{ mb: 2 }}>
          Add Hotel
        </Button>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell>{hotel.name}</TableCell>
                  <TableCell>{hotel.email}</TableCell>
                  <TableCell>{hotel.phone}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEditHotel(hotel)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteHotel(hotel.id)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <CustomerFormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleSaveHotel}
        customer={selectedHotel}
      />
    </Container>
  );
}

export default HotelsPage; 