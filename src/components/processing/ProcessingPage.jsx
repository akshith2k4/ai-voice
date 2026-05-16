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
  Typography,
} from '@mui/material';
import { Add as AddIcon, Check as CheckIcon } from '@mui/icons-material';
import { processingService } from '../../services/processingService';

function ProcessingPage() {
  const [soiledInventory, setSoiledInventory] = useState([]);
  const [processingRequests, setProcessingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSoiledInventory();
    fetchProcessingRequests();
  }, []);

  const fetchSoiledInventory = async () => {
    try {
      setLoading(true);
      const data = await processingService.getAllSoiledInventory();
      setSoiledInventory(data);
    } catch (error) {
      console.error('Error fetching soiled inventory:', error);
      setError('Failed to load soiled inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessingRequests = async () => {
    try {
      setLoading(true);
      const data = await processingService.getProcessingRequests();
      setProcessingRequests(data);
    } catch (error) {
      console.error('Error fetching processing requests:', error);
      setError('Failed to load processing requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcessingRequest = async () => {
    try {
      const requestData = {}; // Collect necessary data for the request
      await processingService.createProcessingRequest(requestData);
      fetchProcessingRequests();
    } catch (error) {
      console.error('Error creating processing request:', error);
    }
  };

  const handleCompleteProcessingRequest = async (id) => {
    try {
      await processingService.completeProcessingRequest(id);
      fetchProcessingRequests();
    } catch (error) {
      console.error('Error completing processing request:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 3 }}>
      <Typography variant="h4" gutterBottom>
        Processing Page
      </Typography>

      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error}</Typography>}

      <Paper sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Soiled Inventory
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {soiledInventory.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.productName}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.soiledQuantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper>
        <Typography variant="h6" sx={{ p: 2 }}>
          Processing Requests
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateProcessingRequest}
          sx={{ mb: 2 }}
        >
          Create Processing Request
        </Button>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Request ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processingRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.id}</TableCell>
                  <TableCell>{request.status}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleCompleteProcessingRequest(request.id)}
                      disabled={request.status === 'Completed'}
                    >
                      <CheckIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}

export default ProcessingPage; 