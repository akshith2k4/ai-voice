import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
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
  Grid,
  Chip,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  LocalLaundryService as LaundryIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import ProcessingRequestDialog from './ProcessingRequestDialog';

function ProcessingRequestRow({ request }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{format(new Date(request.processingDate), 'dd/MM/yyyy')}</TableCell>
        <TableCell>
          <Chip 
            label={`${request.items.length} Products`}
            color="primary"
            variant="outlined"
          />
        </TableCell>
        <TableCell align="right">
          <Chip 
            label={request.items.reduce((sum, item) => sum + item.quantity, 0)}
            color="info"
            variant="outlined"
          />
        </TableCell>
        <TableCell>
          <Chip 
            label={request.status}
            color={
              request.status === 'COMPLETED' ? 'success' :
              request.status === 'IN_PROGRESS' ? 'info' : 'warning'
            }
            size="small"
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Processing Details
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Soiled Stock</TableCell>
                    <TableCell align="right">Processing Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {request.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">
                        {item.productName}
                      </TableCell>
                      <TableCell align="right">{item.soiledStock}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function SoiledInventoryCard({ products }) {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Soiled Inventory Status
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Soiled Quantity</TableCell>
              <TableCell align="right">In Processing</TableCell>
              <TableCell align="right">Available for Processing</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LaundryIcon sx={{ mr: 1, color: 'primary.main', opacity: 0.7 }} />
                    {product.name}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={product.soiledStock}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={product.inProcessing}
                    color="info"
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={product.soiledStock - product.inProcessing}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function LaundryProcessingList() {
  const [processingRequests, setProcessingRequests] = useState([
    {
      id: 1,
      processingDate: "2024-01-30",
      status: "PENDING",
      items: [
        {
          productId: 1,
          productName: "Bed Sheet Washing",
          quantity: 100,
          soiledStock: 300
        },
        {
          productId: 2,
          productName: "Towel Washing",
          quantity: 50,
          soiledStock: 100
        }
      ]
    },
    {
      id: 2,
      processingDate: "2024-01-31",
      status: "IN_PROGRESS",
      items: [
        {
          productId: 1,
          productName: "Bed Sheet Washing",
          quantity: 75,
          soiledStock: 200
        }
      ]
    }
  ]);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  // Add new state for soiled inventory
  const [soiledInventory, setSoiledInventory] = useState([
    {
      id: 1,
      name: 'Bed Sheet Washing',
      soiledStock: 300,
      inProcessing: 175  // Sum of all pending/in-progress processing requests
    },
    {
      id: 2,
      name: 'Towel Washing',
      soiledStock: 100,
      inProcessing: 50
    }
  ]);

  // Calculate in-processing quantities whenever processing requests change
  React.useEffect(() => {
    const inProcessingCounts = {};
    
    processingRequests.forEach(request => {
      if (request.status !== 'COMPLETED') {
        request.items.forEach(item => {
          inProcessingCounts[item.productId] = (inProcessingCounts[item.productId] || 0) + item.quantity;
        });
      }
    });

    setSoiledInventory(prev => prev.map(product => ({
      ...product,
      inProcessing: inProcessingCounts[product.id] || 0
    })));
  }, [processingRequests]);

  const filteredRequests = processingRequests.filter(request => {
    const matchesSearch = request.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    const requestDate = new Date(request.processingDate);
    const isAfterStart = !startDate || requestDate >= startDate;
    const isBeforeEnd = !endDate || requestDate <= endDate;
    return matchesSearch && isAfterStart && isBeforeEnd;
  });

  const handleAddRequest = (newRequest) => {
    setProcessingRequests([...processingRequests, {
      ...newRequest,
      id: processingRequests.length + 1
    }]);
    setOpenDialog(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2
      }}>
        <Typography variant="h5" component="h1">
          Laundry Processing
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Create Processing Request
        </Button>
      </Box>

      {/* Add Soiled Inventory Summary */}
      <SoiledInventoryCard products={soiledInventory} />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button 
              fullWidth 
              variant="outlined"
              onClick={() => {
                setStartDate(null);
                setEndDate(null);
                setSearchTerm('');
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50} /> {/* For expand/collapse */}
                <TableCell>Processing Date</TableCell>
                <TableCell>Products</TableCell>
                <TableCell align="right">Total Items</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((request) => (
                <ProcessingRequestRow key={request.id} request={request} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ProcessingRequestDialog 
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleAddRequest}
      />
    </Container>
  );
}

export default LaundryProcessingList; 