import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  LocalLaundryService as ProcessingIcon,
  DateRange as DateIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

function ProcessingDetails({ process, onClose }) {
  if (!process) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
      <Box sx={{ 
        p: 2,
        px: 3, 
        borderBottom: 1, 
        borderColor: '#e0e0e0',
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Process Details
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 3, py: 2 }}>
        <List disablePadding>
          {/* Basic Information */}
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ProcessingIcon sx={{ mr: 1, color: '#2e7d32' }} />
                  <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                    Basic Information
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DateIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Date:</strong> {format(new Date(process.date), 'dd/MM/yyyy')}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ProcessingIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Status:</strong>{' '}
                        <Chip
                          label={process.status}
                          size="small"
                          color={getStatusColor(process.status)}
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              }
            />
          </ListItem>
          <Divider />

          {/* Processing Items */}
          <ListItem>
            <ListItemText
              primary={
                <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500, mb: 1 }}>
                  Processing Items
                </Typography>
              }
              secondary={
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Soiled Qty</TableCell>
                        <TableCell align="right">Processed Qty</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {process.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="right">{item.soiledQuantity}</TableCell>
                          <TableCell align="right">{item.processedQuantity || 0}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.status}
                              size="small"
                              color={getStatusColor(item.status)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              }
            />
          </ListItem>
          <Divider />

          {/* Notes Section */}
          {process.notes && (
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <NotesIcon sx={{ mr: 1, color: '#2e7d32' }} />
                    <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                      Notes
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {process.notes}
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Box>
    </Box>
  );
}

export default ProcessingDetails; 