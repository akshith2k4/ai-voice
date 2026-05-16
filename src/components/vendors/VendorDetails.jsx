import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Store as VendorIcon,
  LocationOn as LocationIcon,
  ContactMail as ContactIcon,
} from '@mui/icons-material';

function VendorDetails({ vendor, onClose }) {
  if (!vendor) return null;

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff',
    }}>
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
          Vendor Details
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

      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        backgroundColor: '#ffffff',
        px: 3,
        py: 2,
      }}>
        <List disablePadding>
          {/* Basic Vendor Information */}
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <VendorIcon sx={{ mr: 1, color: '#2e7d32' }} />
                  <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                    Basic Information
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                    <strong>Vendor Name:</strong> {vendor.name}
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                    <strong>GST Number:</strong> {vendor.gstNumber}
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                    <strong>Status:</strong>{' '}
                    <Chip
                      label={vendor.status}
                      size="small"
                      color={vendor.status === 'ACTIVE' ? 'success' : 'error'}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Box>
              }
            />
          </ListItem>
          <Divider />

          {/* Contact Information */}
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ContactIcon sx={{ mr: 1, color: '#2e7d32' }} />
                  <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                    Contact Information
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                    <strong>Contact Person:</strong> {vendor.contactPerson}
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                    <strong>Email:</strong> {vendor.email}
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    <strong>Phone:</strong> {vendor.phone}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
          <Divider />

          {/* Address Information */}
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationIcon sx={{ mr: 1, color: '#2e7d32' }} />
                  <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                    Address Information
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" color="text.primary">
                      {vendor.address.street}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {vendor.address.city}, {vendor.address.state} {vendor.address.pincode}
                    </Typography>
                  </Paper>
                </Box>
              }
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
}

export default VendorDetails; 