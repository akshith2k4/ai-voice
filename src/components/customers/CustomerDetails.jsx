import React, { useEffect, useState } from 'react';
import { Drawer, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import { agreementService } from '../../services/agreementService'; // Assuming you have a service to fetch agreements

function CustomerDetails({ customer, onClose }) {
  const [agreements, setAgreements] = useState([]);

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        const data = await agreementService.getCustomerAgreements(customer.id);
        setAgreements(data);
      } catch (error) {
        console.error('Error fetching agreements:', error);
      }
    };

    if (customer) {
      fetchAgreements();
    }
  }, [customer]);

  return (
    <Drawer anchor="right" open={Boolean(customer)} onClose={onClose}>
      <div style={{ width: 300, padding: 16 }}>
        <Typography variant="h6">{customer.name}</Typography>
        <Typography variant="body2">{customer.email}</Typography>
        <Typography variant="body2">{customer.phone}</Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6">Agreements</Typography>
        <List>
          {agreements.map((agreement) => (
            <ListItem key={agreement.id}>
              <ListItemText
                primary={`Agreement Type: ${agreement.type}`}
                secondary={`Start Date: ${agreement.startDate} - End Date: ${agreement.endDate}`}
              />
            </ListItem>
          ))}
        </List>
      </div>
    </Drawer>
  );
}

export default CustomerDetails; 