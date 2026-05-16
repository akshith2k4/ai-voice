import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Button,
  Drawer,
  Stack,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  LocalLaundryService as ProcessingIcon,
  DateRange as DateIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import ProcessingRequestDialog from './ProcessingRequestDialog';
import ProcessingRequestDetails from './ProcessingRequestDetails';
import { soiledService } from '../../services/soiledService';

function SoiledInventoryCard({ items }) {
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Soiled Inventory Status
        </Typography>
      </Box>
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        flexWrap: 'wrap'
      }}>
        {items.map((item) => (
          <Box 
            key={item.id}
            sx={{ 
              p: 1.5,
              bgcolor: 'grey.50',
              borderRadius: 1,
              minWidth: 200,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {item.productName}
            </Typography>
            <Chip
              label={`${item.soiledQuantity} PCS`}
              size="small"
              color="warning"
              variant="outlined"
            />
          </Box>
        ))}
      </Box>
      
    </Paper>
  );
}

function ProcessingList() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
    end: new Date() // today
  });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [soiledInventory, setSoiledInventory] = useState([]);

  useEffect(() => {
    loadSoiledInventory();
    handleDateSearch(); // Automatically fetch requests with the default date range
  }, []);

  const loadSoiledInventory = async () => {
    try {
      setLoading(true);
      const data = await soiledService.getAllSoiledInventory();
      setSoiledInventory(data);
    } catch (error) {
      console.error('Error loading soiled inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSearch = async () => {
    if (!dateRange.start || !dateRange.end) {
      return;
    }
    
    try {
      setIsSearching(true);
      setError(null);
      const filter = {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      };
      const data = await soiledService.getProcessingRequests(filter);
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setError('Failed to fetch requests for selected dates');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateRequest = async (requestData) => {
    try {
      await soiledService.createProcessingRequest(requestData);
      await handleDateSearch(); // Refresh the list after creating a new request
      setOpenDialog(false);
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  const handleRowClick = (request) => {
    setSelectedRequest(request);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  const handleCompleteRequest = async (request, e) => {
    e.stopPropagation(); // Prevent row click
    try {
      // Confirm completion
      if (!window.confirm('Are you sure you want to complete this processing request?')) {
        return;
      }

      // Call the API to complete the processing request
      await soiledService.completeProcessingRequest(request.id);
      await handleDateSearch(); // Reload the list
    } catch (error) {
      console.error('Failed to complete request:', error);
      setError('Failed to complete the processing request');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 3 }}>
      {/* Soiled Inventory Status */}
      <SoiledInventoryCard items={soiledInventory} />

      {/* Date Filters and Add New Request Button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 4 // Increased margin-bottom for better spacing
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <DatePicker
            label="Start Date"
            value={dateRange.start}
            onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
            renderInput={(params) => <TextField {...params} size="small" />}
            maxDate={dateRange.end || undefined}
          />
          <DatePicker
            label="End Date"
            value={dateRange.end}
            onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
            renderInput={(params) => <TextField {...params} size="small" />}
            minDate={dateRange.start || undefined}
          />
          <Button
            variant="contained"
            onClick={handleDateSearch}
            disabled={!dateRange.start || !dateRange.end || isSearching}
            startIcon={<DateIcon />}
            sx={{ 
              height: 40,
              px: 3,
              background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
              boxShadow: '0 2px 4px rgba(25, 118, 210, 0.25)',
            }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </Stack>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ 
            px: 2,
            background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
            boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
          }}
        >
          New Request
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* List of Processing Requests */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Request ID</TableCell>
                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Request Date</TableCell>
                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Processing Type</TableCell>
                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Status</TableCell>
                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Vendor</TableCell>
                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Items Count</TableCell>
                <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow 
                  key={request.id}
                  onClick={() => handleRowClick(request)}
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
                  <TableCell>{request.id}</TableCell>
                  <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                  <TableCell>{request.processingType}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      size="small"
                      color={getStatusColor(request.status)}
                    />
                  </TableCell>
                  <TableCell>{request.laundryVendor?.name || 'In-house'}</TableCell>
                  <TableCell>{request.items?.length || 0}</TableCell>
                  <TableCell>
                    {request.status !== 'COMPLETED' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => handleCompleteRequest(request, e)}
                      >
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ProcessingRequestDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleCreateRequest}
      />

      <Drawer
        anchor="right"
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        PaperProps={{
          elevation: 1,
          sx: {
            width: 450,
            backgroundColor: '#ffffff !important',
            boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        {selectedRequest && (
          <ProcessingRequestDetails 
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
          />
        )}
      </Drawer>
    </Container>
  );
}

export default ProcessingList; 