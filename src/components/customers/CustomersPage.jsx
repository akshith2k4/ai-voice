import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';
import CustomerTable from './CustomerTable';
import CustomerFormDialog from './CustomerFormDialog';
import { Button, Container, Paper } from '@mui/material';

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await customerService.getCustomers();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };

    fetchCustomers();
  }, []);

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setOpenDialog(true);
  };

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setOpenDialog(true);
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      if (selectedCustomer) {
        const updatedCustomer = await customerService.updateCustomer(selectedCustomer.id, customerData);
        setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
      } else {
        const newCustomer = await customerService.createCustomer(customerData);
        setCustomers((prev) => [...prev, newCustomer]);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await customerService.deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  return (
    <Container>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Button variant="contained" onClick={handleAddCustomer} sx={{ mb: 2 }}>
          Add Customer
        </Button>
        <CustomerTable customers={customers} onEdit={handleEditCustomer} onDelete={handleDeleteCustomer} />
      </Paper>
      <CustomerFormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
      />
    </Container>
  );
}

export default CustomersPage; 