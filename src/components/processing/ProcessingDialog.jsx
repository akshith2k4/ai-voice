import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

function ProcessingDialog({ open, onClose, onSave, process }) {
  const [formData, setFormData] = useState({
    date: new Date(),
    items: [],
    status: 'PENDING'
  });

  useEffect(() => {
    if (process) {
      setFormData({
        ...process,
        date: new Date(process.date)
      });
    } else {
      setFormData({
        date: new Date(),
        items: [],
        status: 'PENDING'
      });
    }
  }, [process]);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productName: '',
        soiledQuantity: 0,
        processedQuantity: 0,
        status: 'PENDING'
      }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {process ? 'Edit Process' : 'New Process'}
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Processing Date"
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ ...prev, date }))}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Processing Items
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Soiled Qty</TableCell>
                      <TableCell align="right">Processed Qty</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.productName}
                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.soiledQuantity}
                            onChange={(e) => handleItemChange(index, 'soiledQuantity', Number(e.target.value))}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.processedQuantity}
                            onChange={(e) => handleItemChange(index, 'processedQuantity', Number(e.target.value))}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            size="small" 
                            onClick={() => handleRemoveItem(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddItem}
                sx={{ mt: 1 }}
              >
                Add Item
              </Button>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained"
          onClick={() => {
            onSave(formData);
            onClose();
          }}
          disabled={formData.items.length === 0}
          sx={{ 
            background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
            boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
          }}
        >
          {process ? 'Save Changes' : 'Create Process'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProcessingDialog; 